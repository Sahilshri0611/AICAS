-- ============================================================================
-- CrimeSenseAI — PostgreSQL schema (DDL)
-- Generated from the SQLAlchemy models in backend/app/models/
--
-- Run with:  psql -U <user> -d <database> -f schema.sql
--
-- Notes:
--   * PostGIS geometry columns are included (geom). If you are NOT using
--     PostGIS, comment out the CREATE EXTENSION line and the two `geom`
--     columns + their spatial indexes below.
--   * Enum-like fields are stored as VARCHAR with CHECK constraints, matching
--     the app (SQLAlchemy stores the enum .value as a string).
--   * incidents <-> fir_documents form a mutual FK cycle, so the
--     incidents.fir_id foreign key is added via ALTER TABLE at the end.
-- ============================================================================

-- Optional: geospatial support
CREATE EXTENSION IF NOT EXISTS postgis;

BEGIN;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(32)  NOT NULL DEFAULT 'officer',
    badge_number    VARCHAR(64),
    department      VARCHAR(128),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP    NOT NULL DEFAULT now()
);
CREATE INDEX ix_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- areas  (Nagpur City Police stations — hotspot analytics unit;
--         community_area = station id, district = police zone)
-- ---------------------------------------------------------------------------
CREATE TABLE areas (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(128) NOT NULL,
    community_area INTEGER,
    district       INTEGER,
    centroid_lat   DOUBLE PRECISION,
    centroid_lon   DOUBLE PRECISION,
    geom           geometry(Point, 4326),
    incident_count INTEGER          NOT NULL DEFAULT 0,
    hotspot_score  DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    risk_index     DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at     TIMESTAMP        NOT NULL DEFAULT now(),
    updated_at     TIMESTAMP        NOT NULL DEFAULT now()
);
CREATE INDEX ix_areas_name           ON areas (name);
CREATE INDEX ix_areas_community_area ON areas (community_area);
CREATE INDEX ix_areas_district       ON areas (district);
CREATE INDEX ix_areas_geom           ON areas USING GIST (geom);

-- ---------------------------------------------------------------------------
-- suspects
-- ---------------------------------------------------------------------------
CREATE TABLE suspects (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    alias       VARCHAR(255),
    gender      VARCHAR(16),
    age         INTEGER,
    description TEXT,
    vehicle     VARCHAR(255),
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_suspects_name    ON suspects (name);
CREATE INDEX ix_suspects_vehicle ON suspects (vehicle);

-- ---------------------------------------------------------------------------
-- incidents  (central crime record)
--   fir_id FK added at the end (mutual cycle with fir_documents)
-- ---------------------------------------------------------------------------
CREATE TABLE incidents (
    id                   SERIAL PRIMARY KEY,
    crime_id             VARCHAR(32)  NOT NULL UNIQUE,
    case_number          VARCHAR(64),
    primary_type         VARCHAR(128) NOT NULL,
    description          VARCHAR(255),
    location_description VARCHAR(255),
    block                VARCHAR(255),
    latitude             DOUBLE PRECISION,
    longitude            DOUBLE PRECISION,
    geom                 geometry(Point, 4326),
    area_id              INTEGER REFERENCES areas (id),
    community_area       INTEGER,
    district             INTEGER,
    ward                 INTEGER,
    beat                 INTEGER,
    occurred_at          TIMESTAMP NOT NULL,
    hour                 INTEGER,
    day_of_week          VARCHAR(16),
    month                INTEGER,
    year                 INTEGER,
    risk_score           DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    risk_level           VARCHAR(16) NOT NULL DEFAULT 'Low'
                             CHECK (risk_level IN ('Critical','High','Medium','Low')),
    status               VARCHAR(24) NOT NULL DEFAULT 'Open'
                             CHECK (status IN ('Open','Under Review','Assigned','Closed','Archived')),
    arrest               BOOLEAN NOT NULL DEFAULT FALSE,
    domestic             BOOLEAN NOT NULL DEFAULT FALSE,
    source               VARCHAR(16) NOT NULL DEFAULT 'seed',   -- seed | fir | manual
    fir_id               INTEGER,                               -- FK added below
    assigned_to_id       INTEGER REFERENCES users (id),
    summary              TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT now(),
    updated_at           TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_incidents_crime_id       ON incidents (crime_id);
CREATE INDEX ix_incidents_case_number    ON incidents (case_number);
CREATE INDEX ix_incidents_primary_type   ON incidents (primary_type);
CREATE INDEX ix_incidents_latitude       ON incidents (latitude);
CREATE INDEX ix_incidents_longitude      ON incidents (longitude);
CREATE INDEX ix_incidents_area_id        ON incidents (area_id);
CREATE INDEX ix_incidents_community_area ON incidents (community_area);
CREATE INDEX ix_incidents_district       ON incidents (district);
CREATE INDEX ix_incidents_occurred_at    ON incidents (occurred_at);
CREATE INDEX ix_incidents_hour           ON incidents (hour);
CREATE INDEX ix_incidents_day_of_week    ON incidents (day_of_week);
CREATE INDEX ix_incidents_month          ON incidents (month);
CREATE INDEX ix_incidents_year           ON incidents (year);
CREATE INDEX ix_incidents_risk_score     ON incidents (risk_score);
CREATE INDEX ix_incidents_risk_level     ON incidents (risk_level);
CREATE INDEX ix_incidents_status         ON incidents (status);
CREATE INDEX ix_incidents_fir_id         ON incidents (fir_id);
CREATE INDEX ix_incidents_type_date      ON incidents (primary_type, occurred_at);
CREATE INDEX ix_incidents_geo            ON incidents (latitude, longitude);
CREATE INDEX ix_incidents_geom           ON incidents USING GIST (geom);

-- ---------------------------------------------------------------------------
-- fir_documents  (First Information Report + AI parse result)
-- ---------------------------------------------------------------------------
CREATE TABLE fir_documents (
    id                 SERIAL PRIMARY KEY,
    original_filename  VARCHAR(255) NOT NULL,
    content_type       VARCHAR(64),
    status             VARCHAR(24) NOT NULL DEFAULT 'Uploaded'
                           CHECK (status IN ('Uploaded','OCR Running','Parsing','Parsed',
                                             'Needs Review','Approved','Failed')),
    ocr_text           TEXT,
    ocr_confidence     DOUBLE PRECISION,
    extracted          JSONB,
    field_confidence   JSONB,
    flagged_fields     JSONB,
    overall_confidence DOUBLE PRECISION,
    risk_score         DOUBLE PRECISION,
    incident_id        INTEGER REFERENCES incidents (id),
    uploaded_by_id     INTEGER REFERENCES users (id),
    processed_at       TIMESTAMP,
    error_message      TEXT,
    created_at         TIMESTAMP NOT NULL DEFAULT now(),
    updated_at         TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_fir_documents_status ON fir_documents (status);

-- ---------------------------------------------------------------------------
-- incident_suspect  (many-to-many association)
-- ---------------------------------------------------------------------------
CREATE TABLE incident_suspect (
    incident_id INTEGER NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    suspect_id  INTEGER NOT NULL REFERENCES suspects  (id) ON DELETE CASCADE,
    PRIMARY KEY (incident_id, suspect_id)
);

-- ---------------------------------------------------------------------------
-- alerts
-- ---------------------------------------------------------------------------
CREATE TABLE alerts (
    id                  SERIAL PRIMARY KEY,
    title               VARCHAR(255) NOT NULL,
    category            VARCHAR(32) NOT NULL
                            CHECK (category IN ('Crime Spike','High Risk Incident',
                                                'Repeat Offender','Emerging Hotspot','System Alert')),
    severity            VARCHAR(16) NOT NULL
                            CHECK (severity IN ('Critical','High','Medium','Low')),
    status              VARCHAR(16) NOT NULL DEFAULT 'Active'
                            CHECK (status IN ('Active','Acknowledged','Assigned','Closed')),
    message             TEXT NOT NULL,
    recommended_action  TEXT,
    area_name           VARCHAR(128),
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION,
    related_incident_id INTEGER REFERENCES incidents (id),
    assigned_to_id      INTEGER REFERENCES users (id),
    acknowledged_by_id  INTEGER REFERENCES users (id),
    acknowledged_at     TIMESTAMP,
    closed_at           TIMESTAMP,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_alerts_category  ON alerts (category);
CREATE INDEX ix_alerts_severity  ON alerts (severity);
CREATE INDEX ix_alerts_status    ON alerts (status);
CREATE INDEX ix_alerts_area_name ON alerts (area_name);

-- ---------------------------------------------------------------------------
-- alert_notes
-- ---------------------------------------------------------------------------
CREATE TABLE alert_notes (
    id          SERIAL PRIMARY KEY,
    alert_id    INTEGER NOT NULL REFERENCES alerts (id) ON DELETE CASCADE,
    author_id   INTEGER REFERENCES users (id),
    author_name VARCHAR(255),
    body        TEXT NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_alert_notes_alert_id ON alert_notes (alert_id);

-- ---------------------------------------------------------------------------
-- ml_models  (ML model registry)
-- ---------------------------------------------------------------------------
CREATE TABLE ml_models (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(128) NOT NULL,
    model_type          VARCHAR(48) NOT NULL
                            CHECK (model_type IN ('Hotspot Prediction',
                                                  'Crime Volume Forecast','Area Risk Forecast')),
    version             VARCHAR(32) NOT NULL,
    algorithm           VARCHAR(64) NOT NULL DEFAULT 'XGBoost',
    status              VARCHAR(16) NOT NULL DEFAULT 'Training'
                            CHECK (status IN ('Training','Active','Archived','Failed')),
    accuracy            DOUBLE PRECISION,
    precision           DOUBLE PRECISION,
    recall              DOUBLE PRECISION,
    f1_score            DOUBLE PRECISION,
    metrics             JSONB,
    confusion_matrix    JSONB,
    class_labels        JSONB,
    feature_importances JSONB,
    training_rows       INTEGER,
    trained_at          TIMESTAMP,
    notes               TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_ml_models_model_type ON ml_models (model_type);
CREATE INDEX ix_ml_models_status     ON ml_models (status);

-- ---------------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id          SERIAL PRIMARY KEY,
    actor_id    INTEGER REFERENCES users (id),
    actor_email VARCHAR(255),
    action      VARCHAR(64) NOT NULL,
    entity_type VARCHAR(64),
    entity_id   VARCHAR(64),
    detail      JSONB,
    created_at  TIMESTAMP NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_audit_logs_actor_id    ON audit_logs (actor_id);
CREATE INDEX ix_audit_logs_action      ON audit_logs (action);
CREATE INDEX ix_audit_logs_entity_type ON audit_logs (entity_type);

-- ---------------------------------------------------------------------------
-- case_files  (evidence / documents attached to an incident; bytes on disk)
-- ---------------------------------------------------------------------------
CREATE TABLE case_files (
    id                SERIAL PRIMARY KEY,
    incident_id       INTEGER NOT NULL REFERENCES incidents (id) ON DELETE CASCADE,
    original_filename VARCHAR(255) NOT NULL,
    content_type      VARCHAR(128),
    size_bytes        BIGINT DEFAULT 0,
    stored_name       VARCHAR(128) NOT NULL UNIQUE,
    category          VARCHAR(32) DEFAULT 'Evidence',
    description       TEXT,
    uploaded_by_id    INTEGER REFERENCES users (id),
    uploaded_by_name  VARCHAR(255),
    download_count    INTEGER DEFAULT 0,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_at        TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX ix_case_files_incident_id ON case_files (incident_id);

-- ---------------------------------------------------------------------------
-- Resolve the incidents <-> fir_documents FK cycle
-- ---------------------------------------------------------------------------
ALTER TABLE incidents
    ADD CONSTRAINT fk_incidents_fir_id
    FOREIGN KEY (fir_id) REFERENCES fir_documents (id);

COMMIT;

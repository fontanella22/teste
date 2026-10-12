-- SQLite. Modelo para a futura API; o protótipo usa localStorage.
PRAGMA foreign_keys = ON;
CREATE TABLE owners (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, contact TEXT NOT NULL
);
CREATE TABLE properties (
 id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES owners(id),
 name TEXT NOT NULL, municipality TEXT, area_hectares REAL CHECK(area_hectares >= 0), notes TEXT
);
CREATE TABLE animals (
 id TEXT PRIMARY KEY, property_id TEXT NOT NULL REFERENCES properties(id),
 tag TEXT NOT NULL, name TEXT NOT NULL, breed TEXT NOT NULL,
 sex TEXT NOT NULL CHECK(sex IN ('Fêmea','Macho')), birth_date TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category IN ('Bezerro','Bezerra','Novilha','Vaca em lactação','Vaca seca','Touro','Boi')),
 location TEXT NOT NULL CHECK(location IN ('Pasto','Curral','Enfermaria','Maternidade')),
 UNIQUE(property_id,tag)
);
CREATE TABLE vaccinations (
 id TEXT PRIMARY KEY, animal_id TEXT NOT NULL REFERENCES animals(id),
 vaccine TEXT NOT NULL, applied_on TEXT NOT NULL, next_due_on TEXT NOT NULL,
 responsible TEXT NOT NULL, CHECK(next_due_on >= applied_on)
);
CREATE TABLE treatments (
 id TEXT PRIMARY KEY, animal_id TEXT NOT NULL REFERENCES animals(id),
 type TEXT NOT NULL CHECK(type IN ('Tratamento','Vermifugação')),
 medicine TEXT NOT NULL, first_application TEXT NOT NULL, last_application TEXT NOT NULL,
 milk_withdrawal_days INTEGER NOT NULL CHECK(milk_withdrawal_days >= 0),
 meat_withdrawal_days INTEGER NOT NULL CHECK(meat_withdrawal_days >= 0),
 responsible TEXT NOT NULL, dosage_route_notes TEXT,
 CHECK(last_application >= first_application)
);
CREATE TABLE milk_records (
 id TEXT PRIMARY KEY, animal_id TEXT NOT NULL REFERENCES animals(id),
 recorded_on TEXT NOT NULL, liters REAL NOT NULL CHECK(liters > 0)
);
CREATE TABLE reproductive_events (
 id TEXT PRIMARY KEY, animal_id TEXT NOT NULL REFERENCES animals(id),
 type TEXT NOT NULL CHECK(type IN ('Inseminação','Cobertura','Parto','Início da lactação','Secagem')),
 occurred_on TEXT NOT NULL, expected_birth_on TEXT, notes TEXT,
 CHECK(expected_birth_on IS NULL OR expected_birth_on >= occurred_on)
);
CREATE INDEX vaccinations_due ON vaccinations(next_due_on);
CREATE INDEX treatments_animal ON treatments(animal_id);
CREATE INDEX milk_animal_date ON milk_records(animal_id,recorded_on);
CREATE INDEX reproduction_animal ON reproductive_events(animal_id);
CREATE VIEW treatment_withdrawals AS
 SELECT *, date(last_application, '+' || milk_withdrawal_days || ' days') AS milk_restricted_until,
 date(last_application, '+' || meat_withdrawal_days || ' days') AS meat_restricted_until
 FROM treatments;

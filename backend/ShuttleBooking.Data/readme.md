# ShuttleBooking.Data

## Db

Nel caso in cui il db venga cancellato (in fase di sviluppo), cancellare le [migrazioni vecchie](Migrations) e poi
tramite Rider effettuarle di nuovo.

Per inserire dei dati si può utilizzare questo codice SQL:

```mysql
INSERT INTO Shuttles (Name, Capacity)
VALUES (N'Mottarone (vecchia)', 10);
INSERT INTO Shuttles (Name, Capacity)
VALUES (N'Mottarone (nuova)', 8);
INSERT INTO Shuttles (Name, Capacity)
VALUES (N'Decollino', 8);

SELECT *
FROM Shuttles;
```
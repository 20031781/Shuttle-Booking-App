# ShuttleBookingApi

![Static Badge](https://img.shields.io/badge/C%23-12.0-512bd4)
![Static Badge](https://img.shields.io/badge/.NET-8.0-rebeccapurple)
![Static Badge](https://img.shields.io/badge/Microsoft%20SQL%20Server-brown)

**Versione corrente pubblicata**: [0.0](#versioni)

---

Questo è il README principale della soluzione.

## Tempi di lavoro

Per curiosità, sono registrati i tempi per la realizzazione di questo progetto attraverso `Time Traking`.

La task **Default task** comprende le modifiche della versione [1.0](#versioni)

## Versioni

### xx/10/2024 v: 1.1

TASK: aggiungere le prenotazioni

### 07/10/2024 v: 1.0

- Creata la soluzione, i vari progetti e le cartelle
- Aggiunti gli endpoint, il modello e i metodi degli [Shuttle](ShuttleBooking.Data/Entities/Shuttle.cs)
- Configurato Swagger
- Aggiunti tutti i test necessari per lo [ShuttleController](ShuttleBooking.Presentation/Controller/ShuttlesController.cs)
- Sistemato il [Dockerfile](ShuttleBooking.Presentation/Dockerfile)
- Iniziato a costruire il [docker-compose](docker-compose.yml)
- Sistemato il file [ShuttleController.Api](ShuttleBooking.Presentation/ShuttleController.Api.http)
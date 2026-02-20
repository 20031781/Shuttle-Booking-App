# Test

I test sono stati fatti con XUnit... CONTINUARE

## ShuttleControllerTests

Nei metodi che prevedono la creazione di uno [Shuttle](ShuttleBooking.Data/Entities/Shuttle.cs) sono state aggiunte le
seguenti righe di codice:

```csharp
// Cancello lo shuttle appena creato
var deleteRequest = RequestBase + $"DeleteShuttle/{shuttleId}";
await _client.DeleteAsync(deleteRequest);
```

In questo modo il db rimane pulito.

**Probabilmente usare le `Transaction` o un `Database In-Memory` sarebbe più corretto.**
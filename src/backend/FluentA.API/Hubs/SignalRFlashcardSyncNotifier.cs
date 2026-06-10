using FluentA.Application.BoundedContexts.Flashcards;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRFlashcardSyncNotifier : IFlashcardSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRFlashcardSyncNotifier(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task WordSavedAsync(Guid userId, Guid wordId, Guid pageId, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SyncHub.UserGroup(userId))
            .SendAsync("VocabWordSaved", new VocabWordSavedMessage(wordId, pageId), cancellationToken);
    }

    public Task DecksUpdatedAsync(Guid userId, Guid boardId, IReadOnlyList<Guid> deckIds, CancellationToken cancellationToken = default)
    {
        var group = _hubContext.Clients.Group(SyncHub.UserGroup(userId));
        return Task.WhenAll(deckIds.Select(deckId =>
            group.SendAsync("FlashcardDeckUpdated", new FlashcardDeckUpdatedMessage(boardId, deckId), cancellationToken)));
    }

    private sealed record VocabWordSavedMessage(Guid WordId, Guid PageId);
    private sealed record FlashcardDeckUpdatedMessage(Guid BoardId, Guid DeckId);
}

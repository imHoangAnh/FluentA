namespace FluentA.Application.BoundedContexts.Trash;

public interface ITrashTransaction
{
    Task<T> ExecuteAsync<T>(Func<CancellationToken, Task<T>> action, CancellationToken cancellationToken = default);
}

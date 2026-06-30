namespace FluentA.Application.BoundedContexts.Auth;

public sealed class AvatarStorageUnavailableException : Exception
{
    public AvatarStorageUnavailableException(string message)
        : base(message)
    {
    }
}

public sealed class AvatarStorageOperationException : Exception
{
    public AvatarStorageOperationException(string message)
        : base(message)
    {
    }
}

using System.Threading.Channels;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>Coalesces committed business changes; periodic reconciliation remains the durable backstop.</summary>
public sealed class ScheduleChangeSignal
{
    private readonly Channel<bool> _channel = Channel.CreateBounded<bool>(new BoundedChannelOptions(1)
    {
        SingleReader = true,
        FullMode = BoundedChannelFullMode.DropWrite
    });

    public void Notify() => _channel.Writer.TryWrite(true);

    public ValueTask<bool> WaitAsync(CancellationToken cancellationToken)
        => _channel.Reader.ReadAsync(cancellationToken);
}

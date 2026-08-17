using FluentA.Infrastructure.ContentProcessing.Journal;

namespace FluentA.Application.UnitTests;

public sealed class JournalContentProcessorTests
{
    [Fact]
    public void Process_PreservesSupportedFormattingAndDerivesUnicodePlainText()
    {
        var processor = new JournalContentProcessor();

        var result = processor.Process("<h2>Học tiếng Việt</h2><h4>Mục nhỏ</h4><ol><li>Một</li></ol><ul><li>Hai</li></ul><p><strong>Xin chào</strong> thế giới</p><mark>Nhớ nhé</mark>");

        Assert.Contains("<h2>Học tiếng Việt</h2>", result.Html);
        Assert.Contains("<h4>Mục nhỏ</h4>", result.Html);
        Assert.Contains("<ol><li>Một</li></ol>", result.Html);
        Assert.Contains("<ul><li>Hai</li></ul>", result.Html);
        Assert.Contains("<strong>Xin chào</strong>", result.Html);
        Assert.Contains("<mark>Nhớ nhé</mark>", result.Html);
        Assert.Contains("Học tiếng Việt", result.PlainText);
        Assert.Contains("Xin chào thế giới", result.PlainText);
        Assert.Contains("thế giới ", result.PlainText);
    }

    [Fact]
    public void Process_RemovesScriptsUnsafeAttributesAndUnsafeLinks()
    {
        var processor = new JournalContentProcessor();

        var result = processor.Process(
            "<p onclick=\"alert(1)\">Safe</p><script>alert(2)</script><a href=\"javascript:alert(3)\">Link</a>");

        Assert.DoesNotContain("script", result.Html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("onclick", result.Html, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("javascript:", result.Html, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Safe", result.PlainText);
    }
}

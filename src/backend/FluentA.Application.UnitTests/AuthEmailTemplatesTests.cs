using FluentA.Application.BoundedContexts.Auth;

namespace FluentA.Application.UnitTests;

public sealed class AuthEmailTemplatesTests
{
    [Fact]
    public void BuildVerificationOtpEmailHtml_RendersFullNameAndOtpDigits()
    {
        var html = AuthEmailTemplates.BuildVerificationOtpEmailHtml("Nguyen Van A", "482091", 15);

        Assert.Contains("Hello <strong>Nguyen Van A</strong>,", html);
        Assert.Contains("4", html);
        Assert.Contains("8", html);
        Assert.Contains("2", html);
        Assert.Contains("0", html);
        Assert.Contains("9", html);
        Assert.Contains("1", html);
        Assert.Contains("This code will expire in 15 minutes.", html);
        Assert.Contains("FluentA Account Verification", html);
    }

    [Fact]
    public void BuildVerificationOtpEmailHtml_EncodesHtmlSpecialCharactersInName()
    {
        var html = AuthEmailTemplates.BuildVerificationOtpEmailHtml("Alice <script>alert(1)</script>", "123456", 5);

        Assert.Contains("&lt;script&gt;alert(1)&lt;/script&gt;", html);
        Assert.DoesNotContain("<script>", html);
        Assert.Contains("This code will expire in 5 minutes.", html);
    }

    [Fact]
    public void BuildPasswordResetEmailHtml_RendersFullNameAndResetUrl()
    {
        var resetUrl = "https://example.com/reset-password?token=test-token-123";
        var html = AuthEmailTemplates.BuildPasswordResetEmailHtml("Nguyen Van A", resetUrl, 30);

        Assert.Contains("Hello <strong>Nguyen Van A</strong>,", html);
        Assert.Contains($"href=\"{resetUrl}\"", html);
        Assert.Contains(resetUrl, html);
        Assert.Contains("This password reset link will expire in 30 minutes.", html);
        Assert.Contains("Reset Your FluentA Password", html);
    }

    [Fact]
    public void BuildPasswordResetEmailHtml_EncodesHtmlSpecialCharactersInNameAndUrl()
    {
        var resetUrl = "https://example.com/reset-password?token=abc&param=1";
        var html = AuthEmailTemplates.BuildPasswordResetEmailHtml("Bob & Son", resetUrl, 15);

        Assert.Contains("Bob &amp; Son", html);
        Assert.Contains("token=abc&amp;param=1", html);
        Assert.Contains("This password reset link will expire in 15 minutes.", html);
    }
}


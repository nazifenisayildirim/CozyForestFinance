using System.Net;
using System.Text.Json;
using CozyForest.Application.DTOs;
using CozyForest.Application.Exceptions;

namespace CozyForest.Api.Middleware;

// Tüm hataları tek noktadan yakalayıp kullanıcıya anlaşılır Türkçe mesajla döner.
// Teknik detaylar (stack trace vb.) yalnızca log'a yazılır, response'a yazılmaz.
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleAsync(context, ex);
        }
    }

    private async Task HandleAsync(HttpContext context, Exception ex)
    {
        var (statusCode, message, errors) = ex switch
        {
            NotFoundException nf => (HttpStatusCode.NotFound, nf.Message, (IDictionary<string, string[]>?)null),
            ValidationAppException ve => (HttpStatusCode.BadRequest, ve.Message, ve.Errors),
            AuthAppException ae => (HttpStatusCode.Unauthorized, ae.Message, null),
            _ => (HttpStatusCode.InternalServerError, "Şu anda işlem tamamlanamadı. Biraz sonra tekrar deneyin.", null)
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Beklenmeyen hata: {Path}", context.Request.Path);
        else
            _logger.LogWarning("İşlenmiş hata: {Message} ({Path})", message, context.Request.Path);

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = ApiResponse<object>.Fail(message, errors);
        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}
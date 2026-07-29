namespace CozyForest.Application.DTOs;

// Tüm endpointlerde tutarlı tek bir cevap zarfı.
public class ApiResponse<T>
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public T? Data { get; set; }
    public IDictionary<string, string[]>? Errors { get; set; }

    public static ApiResponse<T> Ok(T data, string? message = null) =>
        new() { Success = true, Data = data, Message = message };

    public static ApiResponse<T> Fail(string message, IDictionary<string, string[]>? errors = null) =>
        new() { Success = false, Message = message, Errors = errors };
}

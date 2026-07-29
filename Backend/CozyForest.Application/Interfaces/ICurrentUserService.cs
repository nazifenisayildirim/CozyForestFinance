namespace CozyForest.Application.Interfaces;

// JWT içindeki oturum kullanıcısına erişim. Implementasyonu Api katmanında
// (HttpContext üzerinden) yapılır; Application katmanı HTTP'den habersiz kalır.
public interface ICurrentUserService
{
    int UserId { get; }
}

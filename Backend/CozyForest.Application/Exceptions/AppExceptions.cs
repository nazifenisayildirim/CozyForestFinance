namespace CozyForest.Application.Exceptions;

// Bilinen, kullanıcıya anlaşılır mesajla dönülecek hatalar için taban sınıf.
public abstract class AppException : Exception
{
    protected AppException(string message) : base(message) { }
}

public class NotFoundException : AppException
{
    public NotFoundException(string message) : base(message) { }
}

public class ValidationAppException : AppException
{
    public IDictionary<string, string[]>? Errors { get; }

    public ValidationAppException(string message, IDictionary<string, string[]>? errors = null) : base(message)
    {
        Errors = errors;
    }
}

public class AuthAppException : AppException
{
    public AuthAppException(string message) : base(message) { }
}

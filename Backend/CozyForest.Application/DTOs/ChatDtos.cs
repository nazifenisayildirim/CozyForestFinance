namespace CozyForest.Application.DTOs;

public class ChatMessageDto
{
    public string Sender { get; set; } = "user"; // "user" or "bot"
    public string Text { get; set; } = string.Empty;
}

public class ChatRequestDto
{
    public string Message { get; set; } = string.Empty;
    public List<ChatMessageDto>? History { get; set; }
    public decimal? Balance { get; set; }
    public decimal? TotalIncome { get; set; }
    public decimal? TotalExpense { get; set; }
    public string? TopExpenseCategory { get; set; }
    public List<string>? Goals { get; set; }
    public List<string>? RecentTransactions { get; set; }
}

public class ChatResponseDto
{
    public string Reply { get; set; } = string.Empty;
}

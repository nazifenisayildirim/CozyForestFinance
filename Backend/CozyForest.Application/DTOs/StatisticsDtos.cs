namespace CozyForest.Application.DTOs;

public class MonthlyStatDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
}

public class CategoryStatDto
{
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal Percent { get; set; }
}

public class StatisticsSummaryDto
{
    public IEnumerable<MonthlyStatDto> Monthly { get; set; } = Array.Empty<MonthlyStatDto>();
    public IEnumerable<CategoryStatDto> CategoryBreakdown { get; set; } = Array.Empty<CategoryStatDto>();
    public decimal CurrentMonthSavings { get; set; }
    public decimal PreviousMonthSavings { get; set; }
    public string? TopExpenseCategory { get; set; }
}

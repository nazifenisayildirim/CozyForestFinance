namespace CozyForest.Application.DTOs;

public class DashboardSummaryDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpense { get; set; }
    public decimal Balance { get; set; }
    public IEnumerable<TransactionListDto> RecentTransactions { get; set; } = Array.Empty<TransactionListDto>();
}

using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Domain.Enums;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Application.Services;

public class StatisticsService : IStatisticsService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public StatisticsService(CozyForestDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    private async Task<int> GetEffectiveUserIdAsync()
    {
        var userId = _currentUser.UserId;
        if (userId <= 0)
        {
            var existingUser = await _db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return existingUser.Id;
            }

            var defaultUser = new User
            {
                FullName = "Orman Sakini",
                Email = "orman@cozyforest.com",
                PasswordHash = PasswordHasher.Hash("Cozy123!"),
                CreatedDate = DateTime.UtcNow
            };
            _db.Users.Add(defaultUser);
            await _db.SaveChangesAsync();
            return defaultUser.Id;
        }
        return userId;
    }

    public async Task<StatisticsSummaryDto> GetSummaryAsync(int months = 6)
    {
        var userId = await GetEffectiveUserIdAsync();
        var since = DateTime.UtcNow.Date.AddMonths(-(months - 1));
        since = new DateTime(since.Year, since.Month, 1);

        var transactions = await _db.Transactions.AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == userId && t.TransactionDate >= since)
            .ToListAsync();

        // Aylık kırılım
        var monthly = new List<MonthlyStatDto>();
        for (var i = 0; i < months; i++)
        {
            var monthDate = since.AddMonths(i);
            var monthTx = transactions.Where(t => t.TransactionDate.Year == monthDate.Year && t.TransactionDate.Month == monthDate.Month);

            monthly.Add(new MonthlyStatDto
            {
                Year = monthDate.Year,
                Month = monthDate.Month,
                TotalIncome = monthTx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
                TotalExpense = monthTx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount)
            });
        }

        // Seçilen dönemdeki gider kategorisi dağılımı
        var expenseTx = transactions.Where(t => t.Type == TransactionType.Expense).ToList();
        var totalExpense = expenseTx.Sum(t => t.Amount);

        var categoryBreakdown = expenseTx
            .GroupBy(t => new { t.CategoryId, Name = t.Category?.Name ?? "Diğer" })
            .Select(g => new CategoryStatDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                TotalAmount = g.Sum(t => t.Amount),
                Percent = totalExpense == 0 ? 0 : Math.Round(g.Sum(t => t.Amount) / totalExpense * 100, 1)
            })
            .OrderByDescending(c => c.TotalAmount)
            .ToList();

        var now = DateTime.UtcNow.Date;
        var currentMonthTx = transactions.Where(t => t.TransactionDate.Year == now.Year && t.TransactionDate.Month == now.Month);
        var previousMonthDate = now.AddMonths(-1);
        var previousMonthTx = transactions.Where(t => t.TransactionDate.Year == previousMonthDate.Year && t.TransactionDate.Month == previousMonthDate.Month);

        decimal Savings(IEnumerable<Domain.Entities.Transaction> tx) =>
            tx.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount) -
            tx.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount);

        return new StatisticsSummaryDto
        {
            Monthly = monthly,
            CategoryBreakdown = categoryBreakdown,
            CurrentMonthSavings = Savings(currentMonthTx),
            PreviousMonthSavings = Savings(previousMonthTx),
            TopExpenseCategory = categoryBreakdown.FirstOrDefault()?.CategoryName
        };
    }
}

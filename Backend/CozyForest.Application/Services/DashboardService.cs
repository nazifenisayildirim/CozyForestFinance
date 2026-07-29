using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Domain.Enums;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public DashboardService(CozyForestDbContext db, ICurrentUserService currentUser)
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

    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        var userId = await GetEffectiveUserIdAsync();

        var totalIncome = await _db.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Income)
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;

        var totalExpense = await _db.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Expense)
            .SumAsync(t => (decimal?)t.Amount) ?? 0m;

        var recent = await _db.Transactions
            .AsNoTracking()
            .Include(t => t.Category)
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.TransactionDate)
            .ThenByDescending(t => t.Id)
            .Take(8)
            .Select(t => new TransactionListDto
            {
                Id = t.Id,
                CategoryId = t.CategoryId,
                CategoryName = t.Category!.Name,
                Type = t.Type,
                Amount = t.Amount,
                TransactionDate = t.TransactionDate,
                Description = t.Description
            })
            .ToListAsync();

        return new DashboardSummaryDto
        {
            TotalIncome = totalIncome,
            TotalExpense = totalExpense,
            Balance = totalIncome - totalExpense,
            RecentTransactions = recent
        };
    }
}

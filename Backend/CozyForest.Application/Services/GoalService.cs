using CozyForest.Application.DTOs;
using CozyForest.Application.Exceptions;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Application.Services;

public class GoalService : IGoalService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GoalService(CozyForestDbContext db, ICurrentUserService currentUser)
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

    public async Task<IEnumerable<GoalListDto>> GetAllAsync()
    {
        var userId = await GetEffectiveUserIdAsync();
        var goals = await _db.Goals.AsNoTracking()
            .Where(g => g.UserId == userId)
            .OrderBy(g => g.IsCompleted)
            .ThenBy(g => g.DueDate)
            .ToListAsync();

        return goals.Select(MapToDto);
    }

    public async Task<GoalListDto> CreateAsync(GoalCreateDto dto)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationAppException("Hedef adı zorunludur.");

        if (dto.TargetAmount <= 0)
            throw new ValidationAppException("Hedef tutarı sıfırdan büyük olmalıdır.");

        if (dto.CurrentAmount < 0 || dto.CurrentAmount > dto.TargetAmount)
            throw new ValidationAppException("Biriken tutar 0 ile hedef tutarı arasında olmalıdır.");

        var userId = await GetEffectiveUserIdAsync();
        var goal = new Goal
        {
            UserId = userId,
            Name = name,
            TargetAmount = dto.TargetAmount,
            CurrentAmount = dto.CurrentAmount,
            DueDate = dto.DueDate,
            IsCompleted = dto.CurrentAmount >= dto.TargetAmount,
            CreatedDate = DateTime.UtcNow
        };

        _db.Goals.Add(goal);
        await _db.SaveChangesAsync();

        return MapToDto(goal);
    }

    public async Task<GoalListDto> UpdateAmountAsync(int id, GoalUpdateAmountDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var goal = await _db.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId)
            ?? throw new NotFoundException("Hedef bulunamadı.");

        if (dto.CurrentAmount < 0 || dto.CurrentAmount > goal.TargetAmount)
            throw new ValidationAppException("Biriken tutar 0 ile hedef tutarı arasında olmalıdır.");

        goal.CurrentAmount = dto.CurrentAmount;
        goal.IsCompleted = goal.CurrentAmount >= goal.TargetAmount;

        await _db.SaveChangesAsync();

        return MapToDto(goal);
    }

    public async Task DeleteAsync(int id)
    {
        var userId = await GetEffectiveUserIdAsync();
        var goal = await _db.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId)
            ?? throw new NotFoundException("Hedef bulunamadı.");

        _db.Goals.Remove(goal);
        await _db.SaveChangesAsync();
    }

    private static GoalListDto MapToDto(Goal g) => new()
    {
        Id = g.Id,
        Name = g.Name,
        TargetAmount = g.TargetAmount,
        CurrentAmount = g.CurrentAmount,
        DueDate = g.DueDate,
        IsCompleted = g.IsCompleted,
        ProgressPercent = g.TargetAmount == 0 ? 0 : Math.Round(g.CurrentAmount / g.TargetAmount * 100, 1)
    };
}
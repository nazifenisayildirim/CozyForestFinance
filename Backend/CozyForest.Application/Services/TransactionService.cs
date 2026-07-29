using CozyForest.Application.DTOs;
using CozyForest.Application.Exceptions;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Application.Services;

public class TransactionService : ITransactionService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public TransactionService(CozyForestDbContext db, ICurrentUserService currentUser)
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

    public async Task<PagedResult<TransactionListDto>> GetAllAsync(TransactionFilterDto filter)
    {
        var userId = await GetEffectiveUserIdAsync();
        var query = _db.Transactions.AsNoTracking().Include(t => t.Category)
            .Where(t => t.UserId == userId)
            .AsQueryable();

        if (filter.StartDate.HasValue)
            query = query.Where(t => t.TransactionDate >= filter.StartDate.Value.Date);

        if (filter.EndDate.HasValue)
            query = query.Where(t => t.TransactionDate <= filter.EndDate.Value.Date);

        if (filter.CategoryId.HasValue)
            query = query.Where(t => t.CategoryId == filter.CategoryId.Value);

        if (filter.Type.HasValue)
            query = query.Where(t => t.Type == filter.Type.Value);

        query = query.OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id);

        var totalCount = await query.CountAsync();

        var page = filter.Page < 1 ? 1 : filter.Page;
        var pageSize = filter.PageSize is < 1 or > 200 ? 20 : filter.PageSize;

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return new PagedResult<TransactionListDto>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    public async Task<TransactionDetailDto> GetByIdAsync(int id)
    {
        var userId = await GetEffectiveUserIdAsync();
        var transaction = await _db.Transactions.AsNoTracking()
            .Include(t => t.Category)
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId)
            ?? throw new NotFoundException("İşlem bulunamadı veya silinmiş olabilir.");

        return MapToDetail(transaction);
    }

    public async Task<TransactionDetailDto> CreateAsync(TransactionCreateDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var category = await ValidateAndGetCategoryAsync(dto.CategoryId, dto.Type, userId);
        ValidateAmountAndDate(dto.Amount, dto.TransactionDate);

        var transaction = new Transaction
        {
            UserId = userId,
            CategoryId = category.Id,
            Type = dto.Type,
            Amount = dto.Amount,
            TransactionDate = dto.TransactionDate.Date,
            Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
            CreatedDate = DateTime.UtcNow
        };

        _db.Transactions.Add(transaction);
        await _db.SaveChangesAsync();

        transaction.Category = category;
        return MapToDetail(transaction);
    }

    public async Task<TransactionDetailDto> UpdateAsync(int id, TransactionUpdateDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var transaction = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId)
            ?? throw new NotFoundException("İşlem bulunamadı veya silinmiş olabilir.");

        var category = await ValidateAndGetCategoryAsync(dto.CategoryId, dto.Type, userId);
        ValidateAmountAndDate(dto.Amount, dto.TransactionDate);

        transaction.CategoryId = category.Id;
        transaction.Type = dto.Type;
        transaction.Amount = dto.Amount;
        transaction.TransactionDate = dto.TransactionDate.Date;
        transaction.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();

        await _db.SaveChangesAsync();

        transaction.Category = category;
        return MapToDetail(transaction);
    }

    public async Task DeleteAsync(int id)
    {
        var userId = await GetEffectiveUserIdAsync();
        var transaction = await _db.Transactions.FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId)
            ?? throw new NotFoundException("İşlem bulunamadı veya silinmiş olabilir.");

        _db.Transactions.Remove(transaction);
        await _db.SaveChangesAsync();
    }

    private async Task<Category> ValidateAndGetCategoryAsync(int categoryId, CozyForest.Domain.Enums.TransactionType type, int userId)
    {
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == categoryId && (c.UserId == null || c.UserId == userId))
            ?? throw new ValidationAppException("Seçilen kategori bulunamadı.");

        if (!category.IsActive)
            throw new ValidationAppException("Seçilen kategori artık aktif değil.");

        if (category.Type != type)
            throw new ValidationAppException("İşlem türü, seçilen kategorinin türüyle uyuşmuyor.");

        return category;
    }

    private static void ValidateAmountAndDate(decimal amount, DateTime date)
    {
        if (amount <= 0)
            throw new ValidationAppException("Tutar sıfırdan büyük olmalıdır.");

        if (date == default)
            throw new ValidationAppException("Geçerli bir tarih giriniz.");
    }

    private static TransactionDetailDto MapToDetail(Transaction t) => new()
    {
        Id = t.Id,
        CategoryId = t.CategoryId,
        CategoryName = t.Category?.Name ?? string.Empty,
        Type = t.Type,
        Amount = t.Amount,
        TransactionDate = t.TransactionDate,
        Description = t.Description,
        CreatedDate = t.CreatedDate
    };
}

using CozyForest.Application.DTOs;
using CozyForest.Application.Exceptions;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Application.Services;

public class CategoryService : ICategoryService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public CategoryService(CozyForestDbContext db, ICurrentUserService currentUser)
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

    public async Task<IEnumerable<CategoryListDto>> GetAllAsync(bool includeInactive = false)
    {
        var userId = await GetEffectiveUserIdAsync();
        var query = _db.Categories.AsNoTracking()
            .Where(c => c.UserId == null || c.UserId == userId)
            .AsQueryable();
        if (!includeInactive)
            query = query.Where(c => c.IsActive);

        return await query
            .OrderBy(c => c.Type).ThenBy(c => c.Name)
            .Select(c => new CategoryListDto
            {
                Id = c.Id,
                Name = c.Name,
                Type = c.Type,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    public async Task<CategoryListDto> CreateAsync(CategoryCreateDto dto)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationAppException("Kategori adı zorunludur.");

        var userId = await GetEffectiveUserIdAsync();
        var exists = await _db.Categories.AnyAsync(c => c.Name == name && c.Type == dto.Type && (c.UserId == null || c.UserId == userId));
        if (exists)
            throw new ValidationAppException("Bu isimde ve türde bir kategori zaten var.");

        var category = new Category { Name = name, Type = dto.Type, IsActive = true, UserId = userId };
        _db.Categories.Add(category);
        await _db.SaveChangesAsync();

        return new CategoryListDto { Id = category.Id, Name = category.Name, Type = category.Type, IsActive = category.IsActive };
    }

    public async Task<CategoryListDto> UpdateAsync(int id, CategoryUpdateDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId)
            ?? throw new NotFoundException("Kategori bulunamadı.");

        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name))
            throw new ValidationAppException("Kategori adı zorunludur.");

        category.Name = name;
        category.Type = dto.Type;
        category.IsActive = dto.IsActive;

        await _db.SaveChangesAsync();

        return new CategoryListDto { Id = category.Id, Name = category.Name, Type = category.Type, IsActive = category.IsActive };
    }

    public async Task DeleteAsync(int id)
    {
        var userId = await GetEffectiveUserIdAsync();
        var category = await _db.Categories.FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId)
            ?? throw new NotFoundException("Kategori bulunamadı.");

        var hasTransactions = await _db.Transactions.AnyAsync(t => t.CategoryId == id);
        if (hasTransactions)
        {
            // Kayıtları olan kategori silinmez; pasife alınır ki geçmiş işlemler bozulmasın.
            category.IsActive = false;
            await _db.SaveChangesAsync();
            return;
        }

        _db.Categories.Remove(category);
        await _db.SaveChangesAsync();
    }
}

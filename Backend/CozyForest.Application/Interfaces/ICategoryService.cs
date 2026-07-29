using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface ICategoryService
{
    Task<IEnumerable<CategoryListDto>> GetAllAsync(bool includeInactive = false);
    Task<CategoryListDto> CreateAsync(CategoryCreateDto dto);
    Task<CategoryListDto> UpdateAsync(int id, CategoryUpdateDto dto);
    Task DeleteAsync(int id);
}

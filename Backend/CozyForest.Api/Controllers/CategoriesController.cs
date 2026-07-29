using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CozyForest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/categories")]
public class CategoriesController : ControllerBase
{
    private readonly ICategoryService _categoryService;

    public CategoriesController(ICategoryService categoryService)
    {
        _categoryService = categoryService;
    }

    // GET /api/categories?includeInactive=false
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<CategoryListDto>>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var categories = await _categoryService.GetAllAsync(includeInactive);
        return Ok(ApiResponse<IEnumerable<CategoryListDto>>.Ok(categories));
    }

    // POST /api/categories
    [HttpPost]
    public async Task<ActionResult<ApiResponse<CategoryListDto>>> Create([FromBody] CategoryCreateDto dto)
    {
        var category = await _categoryService.CreateAsync(dto);
        return Ok(ApiResponse<CategoryListDto>.Ok(category, "Kategori oluşturuldu."));
    }

    // PUT /api/categories/{id}
    [HttpPut("{id:int}")]
    public async Task<ActionResult<ApiResponse<CategoryListDto>>> Update(int id, [FromBody] CategoryUpdateDto dto)
    {
        var category = await _categoryService.UpdateAsync(id, dto);
        return Ok(ApiResponse<CategoryListDto>.Ok(category, "Kategori güncellendi."));
    }

    // DELETE /api/categories/{id}
    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        await _categoryService.DeleteAsync(id);
        return Ok(ApiResponse<object>.Ok(new { }, "Kategori silindi veya pasife alındı."));
    }
}

using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CozyForest.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/goals")]
public class GoalsController : ControllerBase
{
    private readonly IGoalService _goalService;

    public GoalsController(IGoalService goalService)
    {
        _goalService = goalService;
    }

    [HttpGet]
    public async Task<ActionResult<ApiResponse<IEnumerable<GoalListDto>>>> GetAll()
    {
        var goals = await _goalService.GetAllAsync();
        return Ok(ApiResponse<IEnumerable<GoalListDto>>.Ok(goals));
    }

    [HttpPost]
    public async Task<ActionResult<ApiResponse<GoalListDto>>> Create([FromBody] GoalCreateDto dto)
    {
        var goal = await _goalService.CreateAsync(dto);
        return Ok(ApiResponse<GoalListDto>.Ok(goal, "Yeni hedefin hazır. Küçük adımlarla başlayalım."));
    }

    [HttpPut("{id:int}/amount")]
    public async Task<ActionResult<ApiResponse<GoalListDto>>> UpdateAmount(int id, [FromBody] GoalUpdateAmountDto dto)
    {
        var goal = await _goalService.UpdateAmountAsync(id, dto);
        var message = goal.IsCompleted ? "Başardın! Hedefin tamamlandı." : "Hedefine biraz daha yaklaştın.";
        return Ok(ApiResponse<GoalListDto>.Ok(goal, message));
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult<ApiResponse<object>>> Delete(int id)
    {
        await _goalService.DeleteAsync(id);
        return Ok(ApiResponse<object>.Ok(new { }, "Hedef silindi."));
    }
}

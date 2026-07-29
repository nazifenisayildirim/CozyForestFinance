using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface IGoalService
{
    Task<IEnumerable<GoalListDto>> GetAllAsync();
    Task<GoalListDto> CreateAsync(GoalCreateDto dto);
    Task<GoalListDto> UpdateAmountAsync(int id, GoalUpdateAmountDto dto);
    Task DeleteAsync(int id);
}

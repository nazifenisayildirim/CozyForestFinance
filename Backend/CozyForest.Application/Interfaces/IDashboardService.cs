using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}

using CozyForest.Application.DTOs;

namespace CozyForest.Application.Interfaces;

public interface IStatisticsService
{
    Task<StatisticsSummaryDto> GetSummaryAsync(int months = 6);
}

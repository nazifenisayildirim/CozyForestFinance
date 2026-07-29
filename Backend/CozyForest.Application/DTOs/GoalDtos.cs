namespace CozyForest.Application.DTOs;

public class GoalListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateTime? DueDate { get; set; }
    public bool IsCompleted { get; set; }
    public decimal ProgressPercent { get; set; }
}

public class GoalCreateDto
{
    public string Name { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; }
    public DateTime? DueDate { get; set; }
}

public class GoalUpdateAmountDto
{
    public decimal CurrentAmount { get; set; }
}

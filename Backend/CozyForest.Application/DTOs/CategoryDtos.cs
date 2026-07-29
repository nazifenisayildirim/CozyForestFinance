using CozyForest.Domain.Enums;

namespace CozyForest.Application.DTOs;

public class CategoryListDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public bool IsActive { get; set; }
}

public class CategoryCreateDto
{
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
}

public class CategoryUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public bool IsActive { get; set; }
}

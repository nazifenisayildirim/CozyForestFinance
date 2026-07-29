using CozyForest.Domain.Enums;

namespace CozyForest.Domain.Entities;

public class Category
{
    public int Id { get; set; }
    /// <summary>Null ise tüm kullanıcılar tarafından görülebilen paylaşılan varsayılan kategoridir.</summary>
    public int? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public bool IsActive { get; set; } = true;

    public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}

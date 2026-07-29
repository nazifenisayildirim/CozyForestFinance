using CozyForest.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace CozyForest.Infrastructure.Data;

public class CozyForestDbContext : DbContext
{
    public CozyForestDbContext(DbContextOptions<CozyForestDbContext> options) : base(options) { }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Goal> Goals => Set<Goal>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.Property(u => u.FullName).IsRequired().HasMaxLength(80);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.HasIndex(c => new { c.UserId, c.Name, c.Type }).IsUnique();

            entity.HasOne<User>()
                  .WithMany()
                  .HasForeignKey(c => c.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Transaction>(entity =>
        {
            entity.Property(t => t.Amount).HasColumnType("decimal(18,2)");
            entity.Property(t => t.Description).HasMaxLength(300);

            entity.HasOne(t => t.Category)
                  .WithMany(c => c.Transactions)
                  .HasForeignKey(t => t.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(t => t.User)
                  .WithMany(u => u.Transactions)
                  .HasForeignKey(t => t.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Goal>(entity =>
        {
            entity.Property(g => g.Name).IsRequired().HasMaxLength(100);
            entity.Property(g => g.TargetAmount).HasColumnType("decimal(18,2)");
            entity.Property(g => g.CurrentAmount).HasColumnType("decimal(18,2)");

            entity.HasOne(g => g.User)
                  .WithMany(u => u.Goals)
                  .HasForeignKey(g => g.UserId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        // Paylaşılan varsayılan kategoriler (UserId = null) — her kullanıcı bunları görür,
        // kendi özel kategorilerini ayrıca ekleyebilir (bkz. guide 9.3).
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, UserId = null, Name = "Maaş", Type = Domain.Enums.TransactionType.Income, IsActive = true },
            new Category { Id = 2, UserId = null, Name = "Ek Gelir", Type = Domain.Enums.TransactionType.Income, IsActive = true },
            new Category { Id = 3, UserId = null, Name = "Market", Type = Domain.Enums.TransactionType.Expense, IsActive = true },
            new Category { Id = 4, UserId = null, Name = "Kira", Type = Domain.Enums.TransactionType.Expense, IsActive = true },
            new Category { Id = 5, UserId = null, Name = "Ulaşım", Type = Domain.Enums.TransactionType.Expense, IsActive = true },
            new Category { Id = 6, UserId = null, Name = "Eğlence", Type = Domain.Enums.TransactionType.Expense, IsActive = true }
        );
    }
}

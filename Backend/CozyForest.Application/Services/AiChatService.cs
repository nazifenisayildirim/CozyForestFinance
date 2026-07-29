using System.Text;
using System.Text.Json;
using CozyForest.Application.DTOs;
using CozyForest.Application.Interfaces;
using CozyForest.Domain.Entities;
using CozyForest.Domain.Enums;
using CozyForest.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace CozyForest.Application.Services;

public class AiChatService : IAiChatService
{
    private readonly CozyForestDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IConfiguration _config;
    private readonly HttpClient _httpClient;

    public AiChatService(
        CozyForestDbContext db,
        ICurrentUserService currentUser,
        IConfiguration config,
        HttpClient httpClient)
    {
        _db = db;
        _currentUser = currentUser;
        _config = config;
        _httpClient = httpClient;
    }

    private async Task<int> GetEffectiveUserIdAsync()
    {
        var userId = _currentUser.UserId;
        if (userId <= 0)
        {
            var existingUser = await _db.Users.OrderBy(u => u.Id).FirstOrDefaultAsync();
            if (existingUser != null)
            {
                return existingUser.Id;
            }

            var defaultUser = new User
            {
                FullName = "Orman Sakini",
                Email = "orman@cozyforest.com",
                PasswordHash = PasswordHasher.Hash("Cozy123!"),
                CreatedDate = DateTime.UtcNow
            };
            _db.Users.Add(defaultUser);
            await _db.SaveChangesAsync();
            return defaultUser.Id;
        }
        return userId;
    }

    public async Task<ChatResponseDto> AskAsync(ChatRequestDto dto)
    {
        var userId = await GetEffectiveUserIdAsync();

        // 1. Kullanıcıya ait güncel finansal verileri topla (İstekten gelen canlı verileri önceliklendir)
        var totalIncome = dto.TotalIncome ?? (await _db.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Income)
            .SumAsync(t => (decimal?)t.Amount) ?? 0m);

        var totalExpense = dto.TotalExpense ?? (await _db.Transactions
            .Where(t => t.UserId == userId && t.Type == TransactionType.Expense)
            .SumAsync(t => (decimal?)t.Amount) ?? 0m);

        var balance = dto.Balance ?? (totalIncome - totalExpense);

        var goals = (dto.Goals != null && dto.Goals.Any())
            ? dto.Goals
            : (await _db.Goals
                .Where(g => g.UserId == userId && !g.IsCompleted)
                .Select(g => $"{g.Name} (Hedef: {g.TargetAmount:N0} TL, Biriken: {g.CurrentAmount:N0} TL)")
                .ToListAsync());

        var recentExpenses = (dto.RecentTransactions != null && dto.RecentTransactions.Any())
            ? dto.RecentTransactions
            : (await _db.Transactions
                .AsNoTracking()
                .Include(t => t.Category)
                .Where(t => t.UserId == userId && t.Type == TransactionType.Expense)
                .OrderByDescending(t => t.TransactionDate)
                .Take(8)
                .Select(t => $"{t.Category!.Name}: {t.Amount:N2} TL ({t.Description})")
                .ToListAsync());

        var topExpenseCategory = !string.IsNullOrWhiteSpace(dto.TopExpenseCategory)
            ? dto.TopExpenseCategory
            : (await _db.Transactions
                .Where(t => t.UserId == userId && t.Type == TransactionType.Expense)
                .Include(t => t.Category)
                .GroupBy(t => t.Category!.Name)
                .OrderByDescending(g => g.Sum(t => t.Amount))
                .Select(g => g.Key)
                .FirstOrDefaultAsync()) ?? "Henüz harcama yok";

        var apiKey = _config["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
        {
            apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY")
                  ?? Environment.GetEnvironmentVariable("Gemini__ApiKey");
        }

        // Eğer Gemini API Key yapılandırılmamışsa veya boşsa akıllı dahili asistana yönlendir
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey == "YOUR_GEMINI_API_KEY")
        {
            return new ChatResponseDto
            {
                Reply = GenerateSmartLocalReply(dto.Message, balance, totalIncome, totalExpense, goals, recentExpenses)
            };
        }

        // 2. Gemini API isteği oluştur
        try
        {
            var systemInstruction = $@"Sen 'Orman Yapay Zeka Asistanı Robot 🤖' adında neşeli, samimi ve uzman bir kişisel finans asistanısın. 
Cozy Forest Finance uygulamasında kullanıcıya finansal rehberlik ediyorsun. 
Cevapların kısa, anlaşılır, yapıcı ve motivasyon verici olsun (maksimum 3-4 cümle). 
Emoji kullanmayı unutma (🤖, 🌲, 💰, 🐿️, 🎯, 📊).

Kullanıcının Sitede Gördüğü Canlı Finansal Veriler:
- Kalan Bakiye: {balance:N2} TL
- Toplam Gelir: {totalIncome:N2} TL
- Toplam Gider: {totalExpense:N2} TL
- En Çok Harcama Yapılan Kategori: {topExpenseCategory}
- Aktif Hedefler: {(goals.Any() ? string.Join(", ", goals) : "Henüz aktif hedef yok.")}
- Son İşlem ve Harcamalar: {(recentExpenses.Any() ? string.Join("; ", recentExpenses) : "Henüz harcama yok.")}
";

            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        role = "user",
                        parts = new[] { new { text = $"{systemInstruction}\n\nKullanıcı Sorusu: {dto.Message}" } }
                    }
                }
            };

            var jsonContent = new StringContent(
                JsonSerializer.Serialize(requestBody),
                Encoding.UTF8,
                "application/json");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Content = jsonContent;

            using var response = await _httpClient.SendAsync(request);

            var responseJson = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new ChatResponseDto
                {
                    Reply = GenerateSmartLocalReply(dto.Message, balance, totalIncome, totalExpense, goals, recentExpenses)
                };
            }
            using var doc = JsonDocument.Parse(responseJson);

            var replyText = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return new ChatResponseDto
            {
                Reply = replyText?.Trim() ?? GenerateSmartLocalReply(dto.Message, balance, totalIncome, totalExpense, goals, recentExpenses)
            };
        }
        catch (Exception)
        {
            return new ChatResponseDto
            {
                Reply = GenerateSmartLocalReply(dto.Message, balance, totalIncome, totalExpense, goals, recentExpenses)
            };
        }
    }

    private static string GenerateSmartLocalReply(
        string message,
        decimal balance,
        decimal totalIncome,
        decimal totalExpense,
        List<string> goals,
        List<string> recentExpenses)
    {
        var msg = message.ToLowerInvariant();

        if (msg.Contains("bütçe") || msg.Contains("dengele") || msg.Contains("durum"))
        {
            var expRate = totalIncome > 0 ? (int)(totalExpense / totalIncome * 100) : 0;
            return $"Mevcut bakiyeniz ₺ {balance:N2} seviyesinde. Toplam gelirinizin %{expRate} kadarı harcandı. Bütçeniz güvende seyrediyor! 🌲🤖";
        }

        if (msg.Contains("harcadım") || msg.Contains("gider") || msg.Contains("kategori"))
        {
            if (recentExpenses.Any())
            {
                return $"Son harcamalarınız arasında {recentExpenses.First()} öne çıkıyor. Küçük harcamalara dikkat ederek birikiminizi artırabilirsiniz! 📊🍎";
            }
            return $"Toplam gideriniz ₺ {totalExpense:N2}. Harcamalarınızı İstatistikler sayfasından detaylı inceleyebilirsiniz! 📊";
        }

        if (msg.Contains("hedef") || msg.Contains("birikim"))
        {
            if (goals.Any())
            {
                return $"Aktif hedefleriniz: {goals.First()}. Adım adım hedefinize yaklaşıyorsunuz! 🎯🐿️";
            }
            return "Henüz aktif bir hedefiniz bulunmuyor. Hedefler sayfasından hemen yeni bir birikim hedefi ekleyebilirsiniz! 🎯";
        }

        if (msg.Contains("tavsiye") || msg.Contains("öneri") || msg.Contains("tasarruf"))
        {
            return "Birikim yapmanın en etkili yolu: Gelirinizin en az %10'luk kısmını doğrudan birikim hedefinize ayırmaktır. Küçük adımlar büyük sonuçlar doğurur! 🌰✨";
        }

        return $"Sorunuzu analiz ettim: Bakiyeniz ₺ {balance:N2} ile güvende. Harcamalarınıza sadık kalarak Orman hedeflerinize ulaşabilirsiniz! 🤖🌲";
    }
}
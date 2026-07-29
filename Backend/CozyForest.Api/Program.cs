using System.Text;
using CozyForest.Api.Middleware;
using CozyForest.Api.Services;
using CozyForest.Application.Interfaces;
using CozyForest.Application.Services;
using CozyForest.Domain.Entities;
using CozyForest.Infrastructure.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// --- Servisler ---
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        opt.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Cozy Forest Finance API",
        Version = "v1",
        Description = "Kişisel gelir-gider takip uygulaması için Web API."
    });

    // Swagger UI üzerinden JWT ile test edebilmek için "Authorize" desteği.
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Örnek: Bearer {token}"
    });
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<CozyForestDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<ITransactionService, TransactionService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IGoalService, GoalService>();
builder.Services.AddScoped<IStatisticsService, StatisticsService>();

builder.Services.AddHttpClient<IAiChatService, AiChatService>()
    .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
    {
        ConnectCallback = async (context, cancellationToken) =>
        {
            var addresses = await System.Net.Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, System.Net.Sockets.AddressFamily.InterNetwork, cancellationToken);
            var socket = new System.Net.Sockets.Socket(System.Net.Sockets.AddressFamily.InterNetwork, System.Net.Sockets.SocketType.Stream, System.Net.Sockets.ProtocolType.Tcp);
            try
            {
                await socket.ConnectAsync(addresses, context.DnsEndPoint.Port, cancellationToken);
                return new System.Net.Sockets.NetworkStream(socket, ownsSocket: true);
            }
            catch
            {
                socket.Dispose();
                throw;
            }
        }
    });

// --- JWT Authentication ---
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtKey = jwtSection["Key"] ?? "DEV-ONLY-CHANGE-THIS-SECRET-KEY-COZY-FOREST-32+CHARS";
var jwtIssuer = jwtSection["Issuer"] ?? "CozyForestFinance";

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // ÖNEMLİ: ASP.NET Core varsayılan olarak "sub" claim'ini uzun bir
    // ClaimTypes.NameIdentifier URI'sine yeniden eşler. Bu eşleme kapatılmazsa
    // CurrentUserService.UserId hiçbir zaman "sub" claim'ini bulamaz ve 0 döner,
    // bu da her authenticated istekte "Kullanıcı bulunamadı" hatasına yol açar.
    options.MapInboundClaims = false;

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtIssuer,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
    };
});

builder.Services.AddAuthorization();

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:4200" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularClient", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

// --- Middleware pipeline ---
app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Cozy Forest Finance API v1"));
}

app.UseHttpsRedirection();
app.UseCors("AngularClient");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Geliştirme ortamında migration'ları otomatik uygula ve Bera kullanıcısına son 5 aylık veri ekle.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CozyForestDbContext>();
    db.Database.Migrate();

    var beraUser = await db.Users.FirstOrDefaultAsync(u => u.FullName.ToLower().Contains("bera") || u.Email.ToLower().Contains("bera"));
    if (beraUser == null)
    {
        beraUser = new User
        {
            FullName = "Bera",
            Email = "bera@gmail.com",
            PasswordHash = PasswordHasher.Hash("bera123"),
            CreatedDate = DateTime.UtcNow
        };
        db.Users.Add(beraUser);
        await db.SaveChangesAsync();
    }

    var existingTxCount = await db.Transactions.CountAsync(t => t.UserId == beraUser.Id);
    if (existingTxCount < 5)
    {
        var sampleTransactions = new List<Transaction>();
        int currentYear = 2026;
        int[] months = new[] { 3, 4, 5, 6, 7 };

        foreach (var month in months)
        {
            // Gelirler
            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 1, // Maaş
                Type = CozyForest.Domain.Enums.TransactionType.Income,
                Amount = 28500.00m,
                Description = $"{month}. Ay Maaş Ödemesi 💼",
                TransactionDate = new DateTime(currentYear, month, 1)
            });

            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 2, // Ek Gelir
                Type = CozyForest.Domain.Enums.TransactionType.Income,
                Amount = 3500.00m,
                Description = $"{month}. Ay Serbest Proje Kazancı 🪙",
                TransactionDate = new DateTime(currentYear, month, 15)
            });

            // Giderler
            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 4, // Kira
                Type = CozyForest.Domain.Enums.TransactionType.Expense,
                Amount = 11000.00m,
                Description = $"{month}. Ay Ev Kirası 🏠",
                TransactionDate = new DateTime(currentYear, month, 2)
            });

            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 3, // Market
                Type = CozyForest.Domain.Enums.TransactionType.Expense,
                Amount = 4250.00m,
                Description = $"{month}. Ay Mutfak ve Market Alışverişi 🛒",
                TransactionDate = new DateTime(currentYear, month, 8)
            });

            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 5, // Ulaşım
                Type = CozyForest.Domain.Enums.TransactionType.Expense,
                Amount = 1450.00m,
                Description = $"{month}. Ay Yol ve Akaryakıt 🚗",
                TransactionDate = new DateTime(currentYear, month, 12)
            });

            sampleTransactions.Add(new Transaction
            {
                UserId = beraUser.Id,
                CategoryId = 6, // Eğlence
                Type = CozyForest.Domain.Enums.TransactionType.Expense,
                Amount = 2300.00m,
                Description = $"{month}. Ay Hafta Sonu Etkinlikleri & Sinema 🍿",
                TransactionDate = new DateTime(currentYear, month, 22)
            });
        }

        db.Transactions.AddRange(sampleTransactions);
        await db.SaveChangesAsync();
    }

    var existingGoalCount = await db.Goals.CountAsync(g => g.UserId == beraUser.Id);
    if (existingGoalCount == 0)
    {
        var sampleGoals = new List<Goal>
        {
            new Goal
            {
                UserId = beraUser.Id,
                Name = "Acil Durum Fonu 🛡️",
                TargetAmount = 25000.00m,
                CurrentAmount = 18500.00m,
                DueDate = new DateTime(2026, 12, 31),
                IsCompleted = false,
                CreatedDate = DateTime.UtcNow
            },
            new Goal
            {
                UserId = beraUser.Id,
                Name = "Tatil & Doğa Kampı Bütçesi ⛺",
                TargetAmount = 12000.00m,
                CurrentAmount = 8000.00m,
                DueDate = new DateTime(2026, 9, 15),
                IsCompleted = false,
                CreatedDate = DateTime.UtcNow
            }
        };

        db.Goals.AddRange(sampleGoals);
        await db.SaveChangesAsync();
    }
}

app.Run();

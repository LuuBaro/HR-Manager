# Script tự động copy và tích hợp UI
# PowerShell script

$sourceBase = "d:\SYSHRYUEMEI\stitch\stitch"
$destBase = "d:\SYSHRYUEMEI\public"

# Mapping
$mapping = @{
    "hr_admin_dashboard_overview_(bilingual)" = "admin-dashboard.html";
    "employee_payroll_portal_dashboard"       = "login.html";
    "attendance_calendar_management"          = "attendance.html";
    "hồ_sơ_nhân_sự_chi_tiết_(vn"              = "employees.html";
    "quy_trình_phê_duyệt_bảng_lương"          = "payroll-approval.html";
    "cấu_hình_công_thức_lương_&_phụ_cấp"      = "salary-config.html";
    "cấu_hình_bảo_mật_&_truy_cập"             = "security.html";
    "quản_lý_phân_quyền_chi_tiết_(rbac)"      = "rbac.html";
    "nhật_ký_hệ_thống_chi_tiết"               = "logs.html";
}

Write-Host "🚀 Starting UI Integration..." -ForegroundColor Green

foreach ($item in $mapping.GetEnumerator()) {
    $folder = $item.Key
    $file = $item.Value
    
    $sourcePath = Join-Path $sourceBase $folder "code.html"
    $destPath = Join-Path $destBase $file
    
    if (Test-Path $sourcePath) {
        Write-Host "✅ Found: $folder" -ForegroundColor Cyan
        Write-Host "   → Copying to: $file" -ForegroundColor Yellow
        
        # Ensure directory exists
        if (!(Test-Path $destBase)) {
            New-Item -ItemType Directory -Path $destBase -Force
        }
        
        # Copy file
        Copy-Item -Path $sourcePath -Destination $destPath -Force
        
        Write-Host "   ✓ Copied successfully!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Not found: $sourcePath" -ForegroundColor Red
    }
}

Write-Host "`n✨ Done! Files copied to public/" -ForegroundColor Green

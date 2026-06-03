Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Parse existing env variables if .env.local exists
$envPath = Join-Path $PSScriptRoot "..\.env.local"
$existing = @{}
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        if ($_ -match '^\s*([\w.-]+)\s*=\s*(.*)?\s*$') {
            $key = $Matches[1]
            $value = $Matches[2].Trim()
            if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $existing[$key] = $value
        }
    }
}

# 1. Main Form setup
$form = New-Object System.Windows.Forms.Form
$form.Text = "Forge AI Setup Wizard"
$form.Size = New-Object System.Drawing.Size(560, 520)
$form.StartPosition = "CenterScreen"
$form.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#020817")
$form.ForeColor = [System.Drawing.Color]::White
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.MinimizeBox = $false

# Title Bar Accent
$accent = New-Object System.Windows.Forms.Panel
$accent.Size = New-Object System.Drawing.Size(560, 4)
$accent.Location = New-Object System.Drawing.Point(0, 0)
$accent.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#00a1e0")
$form.Controls.Add($accent)

# Logo/Header Text
$logoLabel = New-Object System.Windows.Forms.Label
$logoLabel.Text = "Forge AI"
$logoLabel.Font = New-Object System.Drawing.Font("Segoe UI", 22, [System.Drawing.FontStyle]::Bold)
$logoLabel.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#00a1e0")
$logoLabel.Location = New-Object System.Drawing.Point(20, 20)
$logoLabel.Size = New-Object System.Drawing.Size(500, 40)
$form.Controls.Add($logoLabel)

$subLabel = New-Object System.Windows.Forms.Label
$subLabel.Text = "Standard Desktop Installation & Configuration"
$subLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Regular)
$subLabel.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#64748b")
$subLabel.Location = New-Object System.Drawing.Point(22, 60)
$subLabel.Size = New-Object System.Drawing.Size(500, 20)
$form.Controls.Add($subLabel)

# Group Inputs
$inputsPanel = New-Object System.Windows.Forms.Panel
$inputsPanel.Size = New-Object System.Drawing.Size(500, 310)
$inputsPanel.Location = New-Object System.Drawing.Point(20, 90)
$form.Controls.Add($inputsPanel)

$rowY = 0
function Add-InputField($labelText, $envKey, $placeholder) {
    global $rowY
    
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $labelText
    $lbl.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
    $lbl.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#94a3b8")
    $lbl.Location = New-Object System.Drawing.Point(0, $rowY)
    $lbl.Size = New-Object System.Drawing.Size(500, 16)
    $inputsPanel.Controls.Add($lbl)
    
    $txt = New-Object System.Windows.Forms.TextBox
    $txt.Location = New-Object System.Drawing.Point(0, $rowY + 18)
    $txt.Size = New-Object System.Drawing.Size(500, 25)
    $txt.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#0b1120")
    $txt.ForeColor = [System.Drawing.Color]::White
    $txt.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    $txt.BorderStyle = "FixedSingle"
    if ($existing.ContainsKey($envKey)) {
        $txt.Text = $existing[$envKey]
    } else {
        $txt.PlaceholderText = $placeholder
    }
    $inputsPanel.Controls.Add($txt)
    
    $rowY += 56
    return $txt
}

$txtAnthropic = Add-InputField "ANTHROPIC API KEY" "ANTHROPIC_API_KEY" "sk-ant-..."
$txtSupaUrl = Add-InputField "SUPABASE PROJECT URL" "NEXT_PUBLIC_SUPABASE_URL" "https://your-project.supabase.co"
$txtSupaAnon = Add-InputField "SUPABASE ANON KEY" "NEXT_PUBLIC_SUPABASE_ANON_KEY" "sb_publishable_..."
$txtSupaService = Add-InputField "SUPABASE SERVICE ROLE KEY" "SUPABASE_SERVICE_ROLE_KEY" "sb_secret_..."
$txtDbUrl = Add-InputField "POSTGRES DATABASE URL (DATABASE_URL)" "DATABASE_URL" "postgresql://postgres:password@host:6543/postgres"

# Progress Panel (Hidden initially)
$progressPanel = New-Object System.Windows.Forms.Panel
$progressPanel.Size = New-Object System.Drawing.Size(500, 310)
$progressPanel.Location = New-Object System.Drawing.Point(20, 90)
$progressPanel.Visible = $false
$form.Controls.Add($progressPanel)

$progressStatus = New-Object System.Windows.Forms.Label
$progressStatus.Text = "Preparing installation..."
$progressStatus.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$progressStatus.ForeColor = [System.Drawing.Color]::White
$progressStatus.Location = New-Object System.Drawing.Point(0, 50)
$progressStatus.Size = New-Object System.Drawing.Size(500, 25)
$progressStatus.TextAlign = "Center"
$progressPanel.Controls.Add($progressStatus)

$progressSub = New-Object System.Windows.Forms.Label
$progressSub.Text = "Please wait, setup is running."
$progressSub.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$progressSub.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#64748b")
$progressSub.Location = New-Object System.Drawing.Point(0, 80)
$progressSub.Size = New-Object System.Drawing.Size(500, 20)
$progressSub.TextAlign = "Center"
$progressPanel.Controls.Add($progressSub)

$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Location = New-Object System.Drawing.Point(50, 120)
$progressBar.Size = New-Object System.Drawing.Size(400, 20)
$progressBar.Style = "Continuous"
$progressPanel.Controls.Add($progressBar)

# Action Buttons Panel
$buttonsPanel = New-Object System.Windows.Forms.Panel
$buttonsPanel.Size = New-Object System.Drawing.Size(500, 50)
$buttonsPanel.Location = New-Object System.Drawing.Point(20, 410)
$form.Controls.Add($buttonsPanel)

$btnCancel = New-Object System.Windows.Forms.Button
$btnCancel.Text = "Cancel"
$btnCancel.Size = New-Object System.Drawing.Size(100, 35)
$btnCancel.Location = New-Object System.Drawing.Point(280, 0)
$btnCancel.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#1e293b")
$btnCancel.ForeColor = [System.Drawing.Color]::White
$btnCancel.FlatStyle = "Flat"
$btnCancel.FlatAppearance.BorderSize = 0
$btnCancel.Add_Click({ $form.Close() })
$buttonsPanel.Controls.Add($btnCancel)

$btnInstall = New-Object System.Windows.Forms.Button
$btnInstall.Text = "Install Forge AI"
$btnInstall.Size = New-Object System.Drawing.Size(160, 35)
$btnInstall.Location = New-Object System.Drawing.Point(100, 0)
$btnInstall.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#00a1e0")
$btnInstall.ForeColor = [System.Drawing.Color]::White
$btnInstall.FlatStyle = "Flat"
$btnInstall.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$btnInstall.FlatAppearance.BorderSize = 0
$buttonsPanel.Controls.Add($btnInstall)

# Install Action Trigger
$btnInstall.Add_Click({
    # Validate inputs
    if ([string]::IsNullOrWhiteSpace($txtAnthropic.Text) -or
        [string]::IsNullOrWhiteSpace($txtSupaUrl.Text) -or
        [string]::IsNullOrWhiteSpace($txtSupaAnon.Text) -or
        [string]::IsNullOrWhiteSpace($txtSupaService.Text) -or
        [string]::IsNullOrWhiteSpace($txtDbUrl.Text)) {
        [System.Windows.Forms.MessageBox]::Show("Please fill out all API keys and configuration fields.", "Missing Fields", "OK", "Warning")
        return
    }

    # Hide Inputs & Buttons, Show Progress
    $inputsPanel.Visible = $false
    $buttonsPanel.Visible = $false
    $progressPanel.Visible = $true
    
    # Run Async Install Steps
    Start-InstallFlow
})

# Installation Workflow
function Start-InstallFlow {
    $progressBar.Value = 10
    $progressStatus.Text = "Writing Environment Variables..."
    $progressSub.Text = "Configuring .env.local"
    [System.Windows.Forms.Application]::DoEvents()
    
    # 1. Write configuration to .env.local
    $encryptionKey = $existing["ENCRYPTION_KEY"]
    if ([string]::IsNullOrWhiteSpace($encryptionKey)) {
        $bytes = New-Object Byte[] 32
        $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
        $rng.GetBytes($bytes)
        $encryptionKey = ($bytes | ForEach-Object { "{0:x2}" -f $_ }) -join ""
    }
    
    $appUrl = $existing["NEXT_PUBLIC_APP_URL"]
    if ([string]::IsNullOrWhiteSpace($appUrl)) {
        $appUrl = "http://localhost:3000"
    }

    $envContent = @"
# ─── CORE KEYS (Configured by Setup Wizard) ─────────────────────────
ANTHROPIC_API_KEY=$($txtAnthropic.Text.Trim())
NEXT_PUBLIC_SUPABASE_URL=$($txtSupaUrl.Text.Trim())
NEXT_PUBLIC_SUPABASE_ANON_KEY=$($txtSupaAnon.Text.Trim())
SUPABASE_SERVICE_ROLE_KEY=$($txtSupaService.Text.Trim())
DATABASE_URL=$($txtDbUrl.Text.Trim())
ENCRYPTION_KEY=$($encryptionKey)
NEXT_PUBLIC_APP_URL=$($appUrl)
"@
    
    try {
        # Save env variables preserving other existing variables
        $existingKeys = @{}
        $existingKeys["ANTHROPIC_API_KEY"] = $txtAnthropic.Text.Trim()
        $existingKeys["NEXT_PUBLIC_SUPABASE_URL"] = $txtSupaUrl.Text.Trim()
        $existingKeys["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = $txtSupaAnon.Text.Trim()
        $existingKeys["SUPABASE_SERVICE_ROLE_KEY"] = $txtSupaService.Text.Trim()
        $existingKeys["DATABASE_URL"] = $txtDbUrl.Text.Trim()
        $existingKeys["ENCRYPTION_KEY"] = $encryptionKey
        $existingKeys["NEXT_PUBLIC_APP_URL"] = $appUrl
        
        # Load any other variables
        foreach ($k in $existing.Keys) {
            if (-not $existingKeys.ContainsKey($k)) {
                $existingKeys[$k] = $existing[$k]
            }
        }
        
        $newContent = ""
        foreach ($k in $existingKeys.Keys) {
            $newContent += "$k=$($existingKeys[$k])`n"
        }
        
        [System.IO.File]::WriteAllText($envPath, $newContent.Trim())
    } catch {
        [System.Windows.Forms.MessageBox]::Show("Failed to write to .env.local file: $($_.Exception.Message)", "File Write Error", "OK", "Error")
        $form.Close()
        return
    }

    $progressBar.Value = 25
    $progressStatus.Text = "Installing Node.js packages..."
    $progressSub.Text = "Running 'npm install' in background. This may take 1-2 minutes."
    [System.Windows.Forms.Application]::DoEvents()
    
    # 2. Run npm install using Start-Process
    $npmProcess = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install" -WorkingDirectory "$PSScriptRoot\.." -PassThru -NoNewWindow -WindowStyle Hidden
    
    # Timer to check npm install progress without locking Form thread
    $timer = New-Object System.Windows.Forms.Timer
    $timer.Interval = 200
    $timer.Add_Tick({
        if ($npmProcess.HasExited) {
            $timer.Stop()
            if ($npmProcess.ExitCode -ne 0) {
                [System.Windows.Forms.MessageBox]::Show("npm install failed. Please ensure Node.js is installed on this computer.", "Dependency Error", "OK", "Error")
                $form.Close()
                return
            }
            # Continue to next step
            Run-DbMigrations
        } else {
            # Animate progress bar slightly to show activity
            if ($progressBar.Value -lt 60) { $progressBar.Value += 1 }
            [System.Windows.Forms.Application]::DoEvents()
        }
    })
    $timer.Start()
}

function Run-DbMigrations {
    $progressBar.Value = 65
    $progressStatus.Text = "Running Database Migrations..."
    $progressSub.Text = "Configuring tables and security policies on Supabase..."
    [System.Windows.Forms.Application]::DoEvents()

    # 3. Run node scripts/setup-database.js
    $dbProcess = Start-Process -FilePath "node" -ArgumentList "scripts/setup-database.js" -WorkingDirectory "$PSScriptRoot\.." -PassThru -NoNewWindow -WindowStyle Hidden
    
    $timer2 = New-Object System.Windows.Forms.Timer
    $timer2.Interval = 200
    $timer2.Add_Tick({
        if ($dbProcess.HasExited) {
            $timer2.Stop()
            if ($dbProcess.ExitCode -ne 0) {
                [System.Windows.Forms.MessageBox]::Show("Database setup migrations failed. Please check your Postgres connection details.", "Database Error", "OK", "Error")
                $form.Close()
                return
            }
            # Continue to final steps
            Create-DesktopShortcut
        } else {
            if ($progressBar.Value -lt 85) { $progressBar.Value += 2 }
            [System.Windows.Forms.Application]::DoEvents()
        }
    })
    $timer2.Start()
}

function Create-DesktopShortcut {
    $progressBar.Value = 90
    $progressStatus.Text = "Creating Desktop Shortcuts..."
    $progressSub.Text = "Adding 'Forge AI' to your Desktop"
    [System.Windows.Forms.Application]::DoEvents()

    # 4. Create windows shortcut
    try {
        $desktopPath = [System.IO.Path]::Combine([System.Environment]::GetFolderPath("Desktop"), "Forge AI.lnk")
        $WshShell = New-Object -ComObject WScript.Shell
        $Shortcut = $WshShell.CreateShortcut($desktopPath)
        $Shortcut.TargetPath = "$PSScriptRoot\..\start.bat"
        $Shortcut.WorkingDirectory = "$PSScriptRoot\.."
        $Shortcut.Description = "Launch Forge AI Salesforce Builder"
        $Shortcut.Save()
    } catch {
        # Log error but don't fail setup
        Write-Warning "Failed to create desktop shortcut: $($_.Exception.Message)"
    }

    $progressBar.Value = 100
    $progressStatus.Text = "Installation Complete!"
    $progressSub.Text = "Forge AI has been successfully installed on your computer."
    [System.Windows.Forms.Application]::DoEvents()

    # Transition to success state
    Start-Sleep -Seconds 1
    Show-SuccessScreen
}

function Show-SuccessScreen {
    # Clear panel and display successful screen
    $progressPanel.Controls.Clear()
    
    $checkIcon = New-Object System.Windows.Forms.Label
    $checkIcon.Text = "✓"
    $checkIcon.Font = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
    $checkIcon.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#3fb950")
    $checkIcon.Location = New-Object System.Drawing.Point(0, 30)
    $checkIcon.Size = New-Object System.Drawing.Size(500, 60)
    $checkIcon.TextAlign = "Center"
    $progressPanel.Controls.Add($checkIcon)

    $successTitle = New-Object System.Windows.Forms.Label
    $successTitle.Text = "Forge AI Successfully Installed"
    $successTitle.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
    $successTitle.ForeColor = [System.Drawing.Color]::White
    $successTitle.Location = New-Object System.Drawing.Point(0, 100)
    $successTitle.Size = New-Object System.Drawing.Size(500, 30)
    $successTitle.TextAlign = "Center"
    $progressPanel.Controls.Add($successTitle)

    $successDesc = New-Object System.Windows.Forms.Label
    $successDesc.Text = "A shortcut named 'Forge AI' has been created on your Desktop.`n`nYou can launch the application at any time by double-clicking the shortcut."
    $successDesc.Font = New-Object System.Drawing.Font("Segoe UI", 9.5)
    $successDesc.ForeColor = [System.Drawing.ColorTranslator]::FromHtml("#94a3b8")
    $successDesc.Location = New-Object System.Drawing.Point(50, 140)
    $successDesc.Size = New-Object System.Drawing.Size(400, 60)
    $successDesc.TextAlign = "Center"
    $progressPanel.Controls.Add($successDesc)

    $btnLaunch = New-Object System.Windows.Forms.Button
    $btnLaunch.Text = "Launch Forge AI"
    $btnLaunch.Size = New-Object System.Drawing.Size(180, 38)
    $btnLaunch.Location = New-Object System.Drawing.Point(160, 220)
    $btnLaunch.BackColor = [System.Drawing.ColorTranslator]::FromHtml("#00a1e0")
    $btnLaunch.ForeColor = [System.Drawing.Color]::White
    $btnLaunch.FlatStyle = "Flat"
    $btnLaunch.Font = New-Object System.Drawing.Font("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
    $btnLaunch.FlatAppearance.BorderSize = 0
    $btnLaunch.Add_Click({
        # Run start.bat asynchronously and close
        Start-Process -FilePath "$PSScriptRoot\..\start.bat" -WorkingDirectory "$PSScriptRoot\.."
        $form.Close()
    })
    $progressPanel.Controls.Add($btnLaunch)
}

# Run form
$form.ShowDialog() | Out-Null

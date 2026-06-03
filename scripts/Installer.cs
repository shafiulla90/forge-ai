using System;
using System.IO;
using System.Reflection;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using System.IO.Compression;

namespace ForgeAIInstaller {
    public class InstallerForm : Form {
        private Label titleLabel;
        private Label pathLabel;
        private TextBox pathTextBox;
        private Button browseButton;
        private Button installButton;
        private ProgressBar progressBar;
        private Label statusLabel;
        private string defaultInstallPath;

        public InstallerForm() {
            // Setup form look and feel
            this.Text = "Forge AI Setup";
            this.Size = new Size(500, 320);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = ColorTranslator.FromHtml("#020817");
            this.ForeColor = Color.White;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;

            defaultInstallPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "ForgeAI");

            // Title Label
            titleLabel = new Label();
            titleLabel.Text = "Forge AI Desktop Setup";
            titleLabel.Font = new Font("Segoe UI", 16, FontStyle.Bold);
            titleLabel.ForeColor = ColorTranslator.FromHtml("#00a1e0");
            titleLabel.Location = new Point(20, 20);
            titleLabel.Size = new Size(460, 35);
            this.Controls.Add(titleLabel);

            // Path Label
            pathLabel = new Label();
            pathLabel.Text = "Choose Installation Directory:";
            pathLabel.Font = new Font("Segoe UI", 9, FontStyle.Bold);
            pathLabel.ForeColor = ColorTranslator.FromHtml("#94a3b8");
            pathLabel.Location = new Point(20, 75);
            pathLabel.Size = new Size(460, 20);
            this.Controls.Add(pathLabel);

            // Path Input
            pathTextBox = new TextBox();
            pathTextBox.Text = defaultInstallPath;
            pathTextBox.BackColor = ColorTranslator.FromHtml("#0b1120");
            pathTextBox.ForeColor = Color.White;
            pathTextBox.Font = new Font("Segoe UI", 10);
            pathTextBox.BorderStyle = BorderStyle.FixedSingle;
            pathTextBox.Location = new Point(20, 100);
            pathTextBox.Size = new Size(350, 26);
            this.Controls.Add(pathTextBox);

            // Browse Button
            browseButton = new Button();
            browseButton.Text = "Browse...";
            browseButton.BackColor = ColorTranslator.FromHtml("#1e293b");
            browseButton.ForeColor = Color.White;
            browseButton.FlatStyle = FlatStyle.Flat;
            browseButton.FlatAppearance.BorderSize = 0;
            browseButton.Font = new Font("Segoe UI", 9);
            browseButton.Location = new Point(380, 99);
            browseButton.Size = new Size(85, 27);
            browseButton.Click += new EventHandler(BrowseButton_Click);
            this.Controls.Add(browseButton);

            // Status Label
            statusLabel = new Label();
            statusLabel.Text = "Click Install to begin extracting application files.";
            statusLabel.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            statusLabel.ForeColor = ColorTranslator.FromHtml("#64748b");
            statusLabel.Location = new Point(20, 150);
            statusLabel.Size = new Size(460, 20);
            this.Controls.Add(statusLabel);

            // Progress Bar
            progressBar = new ProgressBar();
            progressBar.Location = new Point(20, 175);
            progressBar.Size = new Size(445, 20);
            progressBar.Visible = false;
            this.Controls.Add(progressBar);

            // Install Button
            installButton = new Button();
            installButton.Text = "Install App";
            installButton.BackColor = ColorTranslator.FromHtml("#00a1e0");
            installButton.ForeColor = Color.White;
            installButton.FlatStyle = FlatStyle.Flat;
            installButton.FlatAppearance.BorderSize = 0;
            installButton.Font = new Font("Segoe UI", 10, FontStyle.Bold);
            installButton.Location = new Point(175, 220);
            installButton.Size = new Size(150, 40);
            installButton.Click += new EventHandler(InstallButton_Click);
            this.Controls.Add(installButton);
        }

        private void BrowseButton_Click(object sender, EventArgs e) {
            using (FolderBrowserDialog fbd = new FolderBrowserDialog()) {
                fbd.Description = "Select target installation folder:";
                fbd.SelectedPath = pathTextBox.Text;
                if (fbd.ShowDialog() == DialogResult.OK) {
                    pathTextBox.Text = fbd.SelectedPath;
                }
            }
        }

        private void InstallButton_Click(object sender, EventArgs e) {
            string installPath = pathTextBox.Text.Trim();
            if (string.IsNullOrEmpty(installPath)) {
                MessageBox.Show("Please specify a valid installation path.", "Invalid Path", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            // Disable controls
            pathTextBox.Enabled = false;
            browseButton.Enabled = false;
            installButton.Enabled = false;
            progressBar.Visible = true;

            // Start extraction
            try {
                progressBar.Value = 10;
                statusLabel.Text = "Creating installation folder...";
                statusLabel.ForeColor = Color.White;
                Application.DoEvents();

                if (!Directory.Exists(installPath)) {
                    Directory.CreateDirectory(installPath);
                }

                progressBar.Value = 30;
                statusLabel.Text = "Extracting embedded zip package resources...";
                Application.DoEvents();

                // Get embedded resource stream
                Assembly assembly = Assembly.GetExecutingAssembly();
                string resourceName = "forgeai.zip"; // Matches resources target key name

                using (Stream stream = assembly.GetManifestResourceStream(resourceName)) {
                    if (stream == null) {
                        MessageBox.Show("Could not find embedded zip file resources in the installer execution package.", "Resources Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        ResetControls();
                        return;
                    }

                    string tempZip = Path.Combine(installPath, "forgeai.zip");
                    using (FileStream fs = new FileStream(tempZip, FileMode.Create)) {
                        stream.CopyTo(fs);
                    }

                    progressBar.Value = 60;
                    statusLabel.Text = "Extracting app structure and script configurations...";
                    Application.DoEvents();

                    // Unpack files
                    ZipFile.ExtractToDirectory(tempZip, installPath);
                    File.Delete(tempZip); // clean up
                }

                progressBar.Value = 90;
                statusLabel.Text = "Launching configuration setup wizard...";
                Application.DoEvents();

                // Start install.bat in background/foreground
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = Path.Combine(installPath, "install.bat");
                psi.WorkingDirectory = installPath;
                psi.UseShellExecute = true;
                Process.Start(psi);

                progressBar.Value = 100;
                statusLabel.Text = "Setup started successfully. Closing wizard.";
                Application.DoEvents();

                System.Threading.Thread.Sleep(1000);
                this.Close();
            }
            catch (Exception ex) {
                MessageBox.Show("Setup execution failed:\n\n" + ex.Message, "Installation Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ResetControls();
            }
        }

        private void ResetControls() {
            pathTextBox.Enabled = true;
            browseButton.Enabled = true;
            installButton.Enabled = true;
            progressBar.Visible = false;
            statusLabel.Text = "Click Install to try again.";
            statusLabel.ForeColor = ColorTranslator.FromHtml("#64748b");
        }

        [STAThread]
        public static void Main() {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new InstallerForm());
        }
    }
}

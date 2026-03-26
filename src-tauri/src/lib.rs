use std::fs;
use std::net::UdpSocket;
use std::path::Path;
use std::process::{Command, Stdio};
use std::thread;
use std::time::Duration;

fn get_my_ip() -> Result<String, String> {
    let sock = UdpSocket::bind("0.0.0.0:0")
        .map_err(|e| format!("bind failed: {e}"))?;

    sock.connect("8.8.8.8:80")
        .map_err(|e| format!("connect failed: {e}"))?;

    let local_addr = sock
        .local_addr()
        .map_err(|e| format!("local_addr failed: {e}"))?;

    Ok(local_addr.ip().to_string())
}

#[tauri::command]
async fn run_scan(
    scan_type: String,
    ip: String,
    port: String,
) -> Result<String, String> {
    let prog_dir = "/home/diablo/proj/SENTINALX/src-tauri/prog";

    let listen_script = format!("{prog_dir}/listen.py");
    let hostdisc_path = format!("{prog_dir}/hostdisc");
    let portlisten_path = format!("{prog_dir}/portlisten");
    let portscanning_path = format!("{prog_dir}/portscanning");
    let tcpcon_path = format!("{prog_dir}/tcpcon");
    let fp_identify_path = format!("{prog_dir}/fp_identify");

    let service_file = format!("{prog_dir}/service.txt");

    let runtime_dir = "/tmp/sentinalx";
    let fp_file = format!("{runtime_dir}/fp.txt");

    if !Path::new(runtime_dir).exists() {
        fs::create_dir_all(runtime_dir)
            .map_err(|e| format!("failed to create runtime dir: {e}"))?;
    }

    match scan_type.as_str() {
        "device" => {
            let listener = Command::new("python3")
                .current_dir(prog_dir)
                .arg(&listen_script)
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("failed to start listener: {e}"))?;

            thread::sleep(Duration::from_secs(5));

            let hostdisc_output = Command::new(&hostdisc_path)
                .current_dir(prog_dir)
                .arg(&ip)
                .arg("--iface")
                .arg("wlan0")
                .arg("--start")
                .arg("1")
                .arg("--end")
                .arg("254")
                .output()
                .map_err(|e| format!("failed to run hostdisc: {e}"))?;

            if !hostdisc_output.status.success() {
                return Err(format!(
                    "hostdisc failed:\n{}",
                    String::from_utf8_lossy(&hostdisc_output.stderr)
                ));
            }

            let listener_output = listener
                .wait_with_output()
                .map_err(|e| format!("failed waiting for listener: {e}"))?;

            let stdout = String::from_utf8_lossy(&listener_output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&listener_output.stderr).to_string();

            Ok(format!("{}\n{}", stdout, stderr))
        }

        "port" => {
            let my_ip = get_my_ip()?;

            let listener = Command::new(&portlisten_path)
                .current_dir(prog_dir)
                .arg(&ip)
                .arg("--timeout")
                .arg("10")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
                .map_err(|e| format!("failed to start port listener: {e}"))?;

            thread::sleep(Duration::from_secs(2));

            let mut scan_cmd = Command::new(&portscanning_path);
            scan_cmd.current_dir(prog_dir).arg(&my_ip).arg(&ip);

            if !port.trim().is_empty() {
                scan_cmd.arg(&port);
            }

            let portscan_output = scan_cmd
                .output()
                .map_err(|e| format!("failed to run portscanning: {e}"))?;

            if !portscan_output.status.success() {
                return Err(format!(
                    "portscanning failed:\n{}",
                    String::from_utf8_lossy(&portscan_output.stderr)
                ));
            }

            let listener_output = listener
                .wait_with_output()
                .map_err(|e| format!("failed waiting for port listener: {e}"))?;

            let listen_stdout = String::from_utf8_lossy(&listener_output.stdout).to_string();
            let listen_stderr = String::from_utf8_lossy(&listener_output.stderr).to_string();
            let scan_stdout = String::from_utf8_lossy(&portscan_output.stdout).to_string();
            let scan_stderr = String::from_utf8_lossy(&portscan_output.stderr).to_string();

            Ok(format!(
                "{}\n{}\n{}\n{}",
                listen_stdout, listen_stderr, scan_stdout, scan_stderr
            ))
        }

        "service" => {
            if port.trim().is_empty() {
                return Err("service scan requires a port".to_string());
            }

            let _ = fs::remove_file(&fp_file);

            let tcpcon_output = Command::new(&tcpcon_path)
                .current_dir(runtime_dir)
                .arg(&ip)
                .arg(&port)
                .arg("--service-file")
                .arg(&service_file)
                .output()
                .map_err(|e| format!("failed to run tcpcon: {e}"))?;

            if !tcpcon_output.status.success() {
                return Err(format!(
                    "tcpcon failed:\n{}",
                    String::from_utf8_lossy(&tcpcon_output.stderr)
                ));
            }

            if !Path::new(&fp_file).exists() {
                return Err(format!("tcpcon finished but fp.txt was not created at {fp_file}"));
            }

            let fp_output = Command::new(&fp_identify_path)
                .current_dir(runtime_dir)
                .arg("--sf")
                .arg(&fp_file)
                .arg("--service-file")
                .arg(&service_file)
                .output()
                .map_err(|e| format!("failed to run fp_identify: {e}"))?;

            if !fp_output.status.success() {
                return Err(format!(
                    "fp_identify failed:\n{}",
                    String::from_utf8_lossy(&fp_output.stderr)
                ));
            }

            Ok(String::from_utf8_lossy(&fp_output.stdout).to_string())
        }

        _ => Err("Invalid scan type".to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![run_scan])
        .run(tauri::generate_context!())
        .expect("error while running application");
}

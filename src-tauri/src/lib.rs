use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize)]
struct FileNode {
    name: String,
    path: String,
    is_directory: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileNode>>,
}

#[tauri::command]
fn read_dir_tree(path: String) -> Result<Vec<FileNode>, String> {
    let path = Path::new(&path);

    if !path.exists() {
        return Err("Path does not exist".to_string());
    }

    if !path.is_dir() {
        return Err("Path is not a directory".to_string());
    }

    read_directory_recursive(path)
}

fn read_directory_recursive(path: &Path) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();

    let entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and directories
        if name.starts_with('.') {
            continue;
        }

        let is_directory = entry_path.is_dir();
        let path_str = entry_path.to_string_lossy().to_string();

        let children = if is_directory {
            match read_directory_recursive(&entry_path) {
                Ok(children) => Some(children),
                Err(_) => Some(Vec::new()),
            }
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: path_str,
            is_directory,
            children,
        });
    }

    // Sort: directories first, then files, both alphabetically
    nodes.sort_by(|a, b| {
        match (a.is_directory, b.is_directory) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(nodes)
}

#[tauri::command]
fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
fn write_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content)
        .map_err(|e| format!("Failed to write file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            read_dir_tree,
            read_file_content,
            write_file_content
        ])
        .setup(|app| {
            // Build the menu
            // On macOS, the first submenu becomes the app menu, so we create it explicitly
            let view_readme = MenuItemBuilder::with_id("view_readme", "View README")
                .build(app)?;

            let app_menu = SubmenuBuilder::new(app, "Marginal")
                .item(&view_readme)
                .build()?;

            let new_file = MenuItemBuilder::with_id("new_file", "New File")
                .accelerator("CmdOrCtrl+N")
                .build(app)?;

            let open_file = MenuItemBuilder::with_id("open_file", "Open File...")
                .accelerator("CmdOrCtrl+O")
                .build(app)?;

            let save = MenuItemBuilder::with_id("save", "Save")
                .accelerator("CmdOrCtrl+S")
                .build(app)?;

            let close_tab = MenuItemBuilder::with_id("close_tab", "Close Tab")
                .accelerator("CmdOrCtrl+W")
                .build(app)?;

            let format_document = MenuItemBuilder::with_id("format_document", "Format Document")
                .accelerator("Shift+Alt+F")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_file)
                .item(&open_file)
                .item(&save)
                .separator()
                .item(&format_document)
                .separator()
                .item(&close_tab)
                .build()?;

            let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", "Toggle Sidebar")
                .accelerator("CmdOrCtrl+B")
                .build(app)?;

            let toggle_outline = MenuItemBuilder::with_id("toggle_outline", "Toggle Outline")
                .accelerator("CmdOrCtrl+\\")
                .build(app)?;

            let view_rendered = MenuItemBuilder::with_id("view_rendered", "View Rendered Document")
                .accelerator("CmdOrCtrl+Shift+R")
                .build(app)?;

            let view_code = MenuItemBuilder::with_id("view_code", "View Markdown Code")
                .accelerator("CmdOrCtrl+Shift+M")
                .build(app)?;

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_sidebar)
                .item(&toggle_outline)
                .separator()
                .item(&view_rendered)
                .item(&view_code)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&view_menu)
                .build()?;

            app.set_menu(menu)?;

            // Handle menu events
            app.on_menu_event(|app, event| {
                let window = app.get_webview_window("main").unwrap();

                match event.id().as_ref() {
                    "new_file" => {
                        let _ = window.emit("menu:new-file", ());
                    }
                    "open_file" => {
                        let _ = window.emit("menu:open-file", ());
                    }
                    "save" => {
                        let _ = window.emit("menu:save", ());
                    }
                    "close_tab" => {
                        let _ = window.emit("menu:close-tab", ());
                    }
                    "format_document" => {
                        let _ = window.emit("menu:format-document", ());
                    }
                    "toggle_sidebar" => {
                        let _ = window.emit("menu:toggle-sidebar", ());
                    }
                    "toggle_outline" => {
                        let _ = window.emit("menu:toggle-outline", ());
                    }
                    "view_rendered" => {
                        let _ = window.emit("menu:view-rendered", ());
                    }
                    "view_code" => {
                        let _ = window.emit("menu:view-code", ());
                    }
                    "view_readme" => {
                        let _ = window.emit("menu:view-readme", ());
                    }
                    _ => {}
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

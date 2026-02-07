use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::sync::Mutex;
use tauri::menu::MenuItem;
use tauri::{Emitter, Listener, Manager};

struct ViewMenuItems {
    toggle_view: MenuItem<tauri::Wry>,
    format_document: MenuItem<tauri::Wry>,
    bold: MenuItem<tauri::Wry>,
    italic: MenuItem<tauri::Wry>,
    heading_1: MenuItem<tauri::Wry>,
    heading_2: MenuItem<tauri::Wry>,
    heading_3: MenuItem<tauri::Wry>,
    heading_4: MenuItem<tauri::Wry>,
    heading_5: MenuItem<tauri::Wry>,
    insert_table: MenuItem<tauri::Wry>,
}

impl ViewMenuItems {
    fn apply_view_mode(&self, mode: &str) {
        let is_code = mode.contains("code");

        let _ = self.format_document.set_enabled(is_code);
        let _ = self.bold.set_enabled(!is_code);
        let _ = self.italic.set_enabled(!is_code);
        let _ = self.heading_1.set_enabled(!is_code);
        let _ = self.heading_2.set_enabled(!is_code);
        let _ = self.heading_3.set_enabled(!is_code);
        let _ = self.heading_4.set_enabled(!is_code);
        let _ = self.heading_5.set_enabled(!is_code);
        let _ = self.insert_table.set_enabled(!is_code);

        let new_text = if is_code {
            "View document"
        } else {
            "View code"
        };
        let _ = self.toggle_view.set_text(new_text);
    }
}

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
    use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            read_dir_tree,
            read_file_content,
            write_file_content
        ])
        .setup(|app| {
            // Build the menu
            // On macOS, the first submenu becomes the app menu, so we create it explicitly
            let about = PredefinedMenuItem::about(app, None, None)?;

            let view_readme = MenuItemBuilder::with_id("view_readme", "View guide")
                .build(app)?;

            let hide = PredefinedMenuItem::hide(app, None)?;
            let hide_others = PredefinedMenuItem::hide_others(app, None)?;
            let show_all = PredefinedMenuItem::show_all(app, None)?;
            let quit = PredefinedMenuItem::quit(app, None)?;

            let app_menu = SubmenuBuilder::new(app, "marginal")
                .item(&about)
                .separator()
                .item(&view_readme)
                .separator()
                .item(&hide)
                .item(&hide_others)
                .item(&show_all)
                .separator()
                .item(&quit)
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

            let find = MenuItemBuilder::with_id("find", "Find")
                .accelerator("CmdOrCtrl+F")
                .build(app)?;

            let bold = MenuItemBuilder::with_id("bold", "Bold")
                .accelerator("CmdOrCtrl+B")
                .build(app)?;

            let italic = MenuItemBuilder::with_id("italic", "Italic")
                .accelerator("CmdOrCtrl+I")
                .build(app)?;

            let heading_1 = MenuItemBuilder::with_id("heading_1", "Heading 1")
                .accelerator("CmdOrCtrl+1")
                .build(app)?;

            let heading_2 = MenuItemBuilder::with_id("heading_2", "Heading 2")
                .accelerator("CmdOrCtrl+2")
                .build(app)?;

            let heading_3 = MenuItemBuilder::with_id("heading_3", "Heading 3")
                .accelerator("CmdOrCtrl+3")
                .build(app)?;

            let heading_4 = MenuItemBuilder::with_id("heading_4", "Heading 4")
                .accelerator("CmdOrCtrl+4")
                .build(app)?;

            let heading_5 = MenuItemBuilder::with_id("heading_5", "Heading 5")
                .accelerator("CmdOrCtrl+5")
                .build(app)?;

            let format_document = MenuItemBuilder::with_id("format_document", "Format Document")
                .accelerator("CmdOrCtrl+Shift+F")
                .build(app)?;

            let insert_table = MenuItemBuilder::with_id("insert_table", "Insert Table")
                .accelerator("CmdOrCtrl+Shift+T")
                .build(app)?;

            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&new_file)
                .item(&open_file)
                .item(&save)
                .separator()
                .item(&close_tab)
                .build()?;

            let cut = PredefinedMenuItem::cut(app, None)?;
            let copy = PredefinedMenuItem::copy(app, None)?;
            let paste = PredefinedMenuItem::paste(app, None)?;
            let select_all = PredefinedMenuItem::select_all(app, None)?;

            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .item(&cut)
                .item(&copy)
                .item(&paste)
                .item(&select_all)
                .separator()
                .item(&find)
                .separator()
                .item(&bold)
                .item(&italic)
                .separator()
                .item(&heading_1)
                .item(&heading_2)
                .item(&heading_3)
                .item(&heading_4)
                .item(&heading_5)
                .separator()
                .item(&insert_table)
                .separator()
                .item(&format_document)
                .build()?;

            let toggle_outline = MenuItemBuilder::with_id("toggle_outline", "Toggle Outline")
                .accelerator("CmdOrCtrl+\\")
                .build(app)?;

            let toggle_view = MenuItemBuilder::with_id("toggle_view", "View document")
                .accelerator("CmdOrCtrl+/")
                .build(app)?;

            let zoom_in = MenuItemBuilder::with_id("zoom_in", "Zoom In")
                .accelerator("CmdOrCtrl+Plus")
                .build(app)?;

            let zoom_out = MenuItemBuilder::with_id("zoom_out", "Zoom Out")
                .accelerator("CmdOrCtrl+Minus")
                .build(app)?;

            let zoom_reset = MenuItemBuilder::with_id("zoom_reset", "Actual Size")
                .accelerator("CmdOrCtrl+0")
                .build(app)?;

            // Store view-specific menu items for dynamic enable/disable
            app.manage(Mutex::new(ViewMenuItems {
                toggle_view: toggle_view.clone(),
                format_document: format_document.clone(),
                bold: bold.clone(),
                italic: italic.clone(),
                heading_1: heading_1.clone(),
                heading_2: heading_2.clone(),
                heading_3: heading_3.clone(),
                heading_4: heading_4.clone(),
                heading_5: heading_5.clone(),
                insert_table: insert_table.clone(),
            }));

            let view_menu = SubmenuBuilder::new(app, "View")
                .item(&toggle_outline)
                .separator()
                .item(&toggle_view)
                .separator()
                .item(&zoom_in)
                .item(&zoom_out)
                .item(&zoom_reset)
                .build()?;

            let menu = MenuBuilder::new(app)
                .item(&app_menu)
                .item(&file_menu)
                .item(&edit_menu)
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
                    "find" => {
                        let _ = window.emit("menu:find", ());
                    }
                    "bold" => {
                        let _ = window.emit("menu:bold", ());
                    }
                    "italic" => {
                        let _ = window.emit("menu:italic", ());
                    }
                    "heading_1" => {
                        let _ = window.emit("menu:heading-1", ());
                    }
                    "heading_2" => {
                        let _ = window.emit("menu:heading-2", ());
                    }
                    "heading_3" => {
                        let _ = window.emit("menu:heading-3", ());
                    }
                    "heading_4" => {
                        let _ = window.emit("menu:heading-4", ());
                    }
                    "heading_5" => {
                        let _ = window.emit("menu:heading-5", ());
                    }
                    "format_document" => {
                        let _ = window.emit("menu:format-document", ());
                    }
                    "insert_table" => {
                        let _ = window.emit("menu:insert-table", ());
                    }
                    "toggle_outline" => {
                        let _ = window.emit("menu:toggle-outline", ());
                    }
                    "toggle_view" => {
                        let _ = window.emit("menu:toggle-view", ());
                    }
                    "zoom_in" => {
                        let _ = window.emit("menu:zoom-in", ());
                    }
                    "zoom_out" => {
                        let _ = window.emit("menu:zoom-out", ());
                    }
                    "zoom_reset" => {
                        let _ = window.emit("menu:zoom-reset", ());
                    }
                    "view_readme" => {
                        let _ = window.emit("menu:view-readme", ());
                    }
                    _ => {}
                }
            });

            // Apply window vibrancy
            let main_window = app.get_webview_window("main").unwrap();
            #[cfg(target_os = "macos")]
            {
                use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
                apply_vibrancy(&main_window, NSVisualEffectMaterial::Sidebar, None, None)
                    .expect("Failed to apply vibrancy");
            }

            // Listen for view mode changes from frontend to update menu items
            let app_handle = app.handle().clone();
            app.listen("view-mode-changed", move |event| {
                let payload = event.payload();
                if let Some(items) = app_handle.try_state::<Mutex<ViewMenuItems>>() {
                    if let Ok(items) = items.lock() {
                        items.apply_view_mode(payload);
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

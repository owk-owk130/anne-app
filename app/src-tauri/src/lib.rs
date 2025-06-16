use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize, Deserialize)]
struct Comment {
    id: String,
    text: String,
    timestamp: DateTime<Utc>,
    is_ai: bool,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImageMetadata {
    id: String,
    filename: String,
    original_name: String,
    timestamp: DateTime<Utc>,
    analysis_result: Option<String>,
    user_comments: Vec<Comment>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ImagesData {
    images: Vec<ImageMetadata>,
}

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn save_image(
    app: tauri::AppHandle,
    image_data: Vec<u8>,
    original_name: String,
    analysis_result: Option<String>,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let anne_app_dir = app_data_dir.join("anne-app");
    let images_dir = anne_app_dir.join("images");
    
    // ディレクトリが存在しない場合は作成
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;
    
    // 画像IDとファイル名を生成
    let timestamp = Utc::now();
    let image_id = format!("img_{}", timestamp.timestamp());
    let extension = original_name.split('.').last().unwrap_or("jpg");
    let filename = format!("{}.{}", image_id, extension);
    
    // 画像ファイルを保存
    let image_path = images_dir.join(&filename);
    fs::write(&image_path, image_data).map_err(|e| e.to_string())?;
    
    // メタデータを更新
    let metadata_path = anne_app_dir.join("metadata.json");
    let mut images_data = if metadata_path.exists() {
        let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
        serde_json::from_str::<ImagesData>(&metadata_content).unwrap_or(ImagesData { images: Vec::new() })
    } else {
        ImagesData { images: Vec::new() }
    };
    
    let new_image = ImageMetadata {
        id: image_id.clone(),
        filename,
        original_name,
        timestamp,
        analysis_result,
        user_comments: Vec::new(),
    };
    
    images_data.images.push(new_image);
    
    let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
    fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
    
    Ok(image_id)
}

#[tauri::command]
async fn get_saved_images(app: tauri::AppHandle) -> Result<Vec<ImageMetadata>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let metadata_path = app_data_dir.join("anne-app").join("metadata.json");
    
    if !metadata_path.exists() {
        return Ok(Vec::new());
    }
    
    let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    Ok(images_data.images)
}

#[tauri::command]
async fn load_image(app: tauri::AppHandle, image_id: String) -> Result<Vec<u8>, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let metadata_path = app_data_dir.join("anne-app").join("metadata.json");
    
    if !metadata_path.exists() {
        return Err("No saved images found".to_string());
    }
    
    let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    let image_meta = images_data.images.iter()
        .find(|img| img.id == image_id)
        .ok_or("Image not found")?;
    
    let image_path = app_data_dir.join("anne-app").join("images").join(&image_meta.filename);
    let image_data = fs::read(&image_path).map_err(|e| e.to_string())?;
    
    Ok(image_data)
}

#[tauri::command]
async fn update_image_comments(
    app: tauri::AppHandle,
    image_id: String,
    comments: Vec<Comment>,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let metadata_path = app_data_dir.join("anne-app").join("metadata.json");
    
    if !metadata_path.exists() {
        return Err("No saved images found".to_string());
    }
    
    let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;
    
    if let Some(image_meta) = images_data.images.iter_mut().find(|img| img.id == image_id) {
        image_meta.user_comments = comments;
        
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("Image not found".to_string())
    }
}

#[tauri::command]
async fn delete_post(app: tauri::AppHandle, post_id: String) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let anne_app_dir = app_data_dir.join("anne-app");
    let metadata_path = anne_app_dir.join("metadata.json");
    let images_dir = anne_app_dir.join("images");

    if !metadata_path.exists() {
        return Err("メタデータファイルが見つかりません".to_string());
    }

    // メタデータを読み込み
    let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;

    // 削除対象の投稿を検索
    let post_index = images_data.images.iter().position(|img| img.id == post_id);
    
    if let Some(index) = post_index {
        let post = &images_data.images[index];
        
        // 画像ファイルを削除
        let image_path = images_dir.join(&post.filename);
        if image_path.exists() {
            fs::remove_file(&image_path).map_err(|e| format!("画像ファイル削除エラー: {}", e))?;
        }
        
        // メタデータから投稿を削除
        images_data.images.remove(index);
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("指定された投稿が見つかりません".to_string())
    }
}

#[tauri::command]
async fn delete_comment(
    app: tauri::AppHandle,
    post_id: String,
    comment_id: String,
) -> Result<(), String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let metadata_path = app_data_dir.join("anne-app").join("metadata.json");

    if !metadata_path.exists() {
        return Err("メタデータファイルが見つかりません".to_string());
    }

    let metadata_content = fs::read_to_string(&metadata_path).map_err(|e| e.to_string())?;
    let mut images_data: ImagesData = serde_json::from_str(&metadata_content).map_err(|e| e.to_string())?;

    // 投稿を検索
    if let Some(post) = images_data.images.iter_mut().find(|img| img.id == post_id) {
        // コメントを削除（AI分析結果は削除不可）
        let original_len = post.user_comments.len();
        post.user_comments.retain(|comment| comment.id != comment_id);
        
        if post.user_comments.len() == original_len {
            return Err("指定されたコメントが見つかりません".to_string());
        }
        
        // 更新されたメタデータを保存
        let updated_metadata = serde_json::to_string_pretty(&images_data).map_err(|e| e.to_string())?;
        fs::write(&metadata_path, updated_metadata).map_err(|e| e.to_string())?;
        
        Ok(())
    } else {
        Err("指定された投稿が見つかりません".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            save_image,
            get_saved_images,
            load_image,
            update_image_comments,
            delete_post,
            delete_comment
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

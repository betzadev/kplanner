use kplanner_lib::specta_builder;
use specta_typescript::Typescript;
use std::path::PathBuf;

fn main() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let out_path = manifest_dir.join("../src/types/bindings.ts");
    let builder = specta_builder();
    builder
        .export(Typescript::default(), &out_path)
        .expect("Failed to export typescript bindings");

    let content = std::fs::read_to_string(&out_path).expect("read bindings");
    let comment = "// NOTA: specta-typescript 0.0.12 emite | null para f32 con serde(default); en Rust es f32, no Option<f32>
";
    let updated = format!("{}{}", comment, content);
    std::fs::write(&out_path, updated).expect("write bindings");
    println!("Exported bindings to {}", out_path.display());
}

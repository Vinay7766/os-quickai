use boa_engine::{Context, Source};

fn main() {
    let mut context = Context::default();
    let code = "1 + 1";
    match context.eval(Source::from_bytes(code.as_bytes())) {
        Ok(val) => println!("Success: {:?}", val),
        Err(err) => println!("Error: {:?}", err)
    }
}

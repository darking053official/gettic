(module
  (func $render_emoji (param $id i32) (result i32)
    (local $r i32) (local $g i32) (local $b i32)
    (local.set $r (i32.rem_u (i32.mul (local.get $id) (i32.const 127)) (i32.const 256)))
    (local.set $g (i32.rem_u (i32.mul (local.get $id) (i32.const 251)) (i32.const 256)))
    (local.set $b (i32.rem_u (i32.mul (local.get $id) (i32.const 199)) (i32.const 256)))
    (i32.or (i32.or (i32.shl (local.get $r) (i32.const 16)) (i32.shl (local.get $g) (i32.const 8))) (local.get $b)))
  (export "render_emoji" (func $render_emoji)))

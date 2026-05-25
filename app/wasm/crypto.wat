(module
  (func $encrypt (param $msg_ptr i32) (param $msg_len i32) (param $key_ptr i32) (param $key_len i32) (param $out_ptr i32)
    (local $i i32) (local $j i32)
    (loop $loop
      (i32.ge_u (local.get $i) (local.get $msg_len)) (if (then (return)))
      (i32.store8 (i32.add (local.get $out_ptr) (local.get $i))
        (i32.xor (i32.load8_u (i32.add (local.get $msg_ptr) (local.get $i)))
                 (i32.load8_u (i32.add (local.get $key_ptr) (local.get $j)))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (local.set $j (i32.rem_u (i32.add (local.get $j) (i32.const 1)) (local.get $key_len)))
      (br $loop)))
  (export "encrypt" (func $encrypt)) (memory (export "memory") 1))

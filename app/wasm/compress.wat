(module
  (func $compress_rle (param $in_ptr i32) (param $in_len i32) (param $out_ptr i32) (result i32)
    (local $i i32) (local $j i32) (local $count i32) (local $byte i32)
    (local.set $i (i32.const 0))
    (local.set $j (i32.const 0))
    (block $done
      (loop $outer
        (i32.ge_u (local.get $i) (local.get $in_len))
        (if (then (br $done)))
        
        (local.set $byte (i32.load8_u (i32.add (local.get $in_ptr) (local.get $i))))
        (local.set $count (i32.const 1))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        
        (block $inner_done
          (loop $inner
            (i32.ge_u (local.get $i) (local.get $in_len)) (if (then (br $inner_done)))
            (i32.ne (i32.load8_u (i32.add (local.get $in_ptr) (local.get $i))) (local.get $byte)) (if (then (br $inner_done)))
            (i32.ge_u (local.get $count) (i32.const 255)) (if (then (br $inner_done)))
            (local.set $count (i32.add (local.get $count) (i32.const 1)))
            (local.set $i (i32.add (local.get $i) (i32.const 1)))
            (br $inner)
          )
        )
        
        (i32.store8 (i32.add (local.get $out_ptr) (local.get $j)) (local.get $byte))
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        (i32.store8 (i32.add (local.get $out_ptr) (local.get $j)) (local.get $count))
        (local.set $j (i32.add (local.get $j) (i32.const 1)))
        (br $outer)
      )
    )
    (local.get $j)
  )
  (export "compress_rle" (func $compress_rle))
  (memory (export "memory") 1)
)

(module
  (func $roll_dice (param $sides i32) (result i32)
    (local $seed i32)
    (local.set $seed (i32.const 42))
    (i32.add
      (i32.rem_u
        (i32.wrap_i64
          (i64.reinterpret_f64
            (f64.mul
              (f64.convert_i32_u (local.get $seed))
              (f64.const 3.14159)
            )
          )
        )
        (local.get $sides)
      )
      (i32.const 1)
    )
  )
  (func $check_prime (param $n i32) (result i32)
    (local $i i32)
    (if (i32.le_s (local.get $n) (i32.const 1)) (then (return (i32.const 0))))
    (if (i32.le_s (local.get $n) (i32.const 3)) (then (return (i32.const 1))))
    (if (i32.eqz (i32.rem_s (local.get $n) (i32.const 2))) (then (return (i32.const 0))))
    (local.set $i (i32.const 3))
    (block $done
      (loop $check
        (i32.gt_s (i32.mul (local.get $i) (local.get $i)) (local.get $n)) (if (then (br $done)))
        (i32.eqz (i32.rem_s (local.get $n) (local.get $i))) (if (then (return (i32.const 0))))
        (local.set $i (i32.add (local.get $i) (i32.const 2)))
        (br $check)
      )
    )
    (i32.const 1)
  )
  (export "roll_dice" (func $roll_dice))
  (export "check_prime" (func $check_prime))
  (memory (export "memory") 1)
)

(module
  (func $process_audio (param $sample_ptr i32) (param $len i32) (param $pitch i32)
    (local $i i32) (local $sample i32)
    (loop $loop
      (i32.ge_u (local.get $i) (local.get $len)) (if (then (return)))
      (local.set $sample (i32.load8_s (i32.add (local.get $sample_ptr) (local.get $i))))
      (local.set $sample (i32.mul (local.get $sample) (local.get $pitch)))
      (if (i32.gt_s (local.get $sample) (i32.const 127)) (then (local.set $sample (i32.const 127))))
      (if (i32.lt_s (local.get $sample) (i32.const -128)) (then (local.set $sample (i32.const -128))))
      (i32.store8 (i32.add (local.get $sample_ptr) (local.get $i)) (local.get $sample))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $loop)))
  (export "process_audio" (func $process_audio)) (memory (export "memory") 1))

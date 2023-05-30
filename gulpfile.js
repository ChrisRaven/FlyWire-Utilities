const gulp = require('gulp');
const concat = require('gulp-concat');

const files = [
  'header.js',
  'global_constants.js',
  'global_variables.js',
  'add_dock.js',
  'fixes.js',
  'ls.js',
  'main.js',
  'jump_to_segment.js',
  'jump_to_segment_button.js',
  'open_in_new_tab.js',
  'save_segment.js',
  'hide_all_but.js',
  'jump_to_start.js',
  'change_resolution.js',
  'delete_split_point.js',
  'delete_annotation_point.js',
  'actions_after_claim.js',
  'toggle_background.js',
  'neuropils.js',
  'number_of_segments.js',
  'copy_paste_position.js',
  'options.js'

].map(file => 'src/' + file)

gulp.task('build', function () {
  return gulp.src(files)
    .pipe(concat('Utilities.user.js'))
    .pipe(gulp.dest('.'));
});

gulp.task('watch', function () {
  return gulp.watch(files, gulp.series('build'));
});

gulp.task('default', gulp.series('build', 'watch'));
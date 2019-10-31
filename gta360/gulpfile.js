let gulp = require('gulp')
let cleanCSS = require('gulp-clean-css')

gulp.task('minify-css', () => {
  return gulp.src('public/css/*.css')
    .pipe(cleanCSS())
    .pipe(gulp.dest('public/dist/css'));
})

gulp.task('default', ['minify-css']);

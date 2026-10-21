<?php
/**
 * Custom Autoloader for George Steuart Job Portal
 * Handles PHPMailer and PSR-3 namespaces without Composer
 */

spl_autoload_register(function ($class) {
    // Project-specific namespace prefixes
    $prefixes = [
        'PHPMailer\\PHPMailer\\' => __DIR__ . '/PHPMailer/',
        'Psr\\Log\\' => __DIR__ . '/Psr/Log/',
    ];

    foreach ($prefixes as $prefix => $base_dir) {
        // Does the class use the namespace prefix?
        $len = strlen($prefix);
        if (strncmp($prefix, $class, $len) !== 0) {
            continue;
        }

        // Get the relative class name
        $relative_class = substr($class, $len);

        // Replace the namespace prefix with the base directory, 
        // replace namespace separators with directory separators in the relative class name, 
        // and append with .php
        $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';

        // If the file exists, require it
        if (file_exists($file)) {
            require $file;
            return;
        }
    }
});

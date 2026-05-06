package com.personalfinance.accountingsystem.security;

import com.personalfinance.accountingsystem.entity.User;
import com.personalfinance.accountingsystem.repository.UserRepository;
import com.personalfinance.accountingsystem.util.UserContextHolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private UserRepository userRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String requestURI = request.getRequestURI();

        // 只放行静态资源（前端页面、CSS、JS）
        if (requestURI.startsWith("/js/") || requestURI.startsWith("/css/") ||
                requestURI.equals("/index.html") || requestURI.equals("/app.html") ||
                requestURI.equals("/login.html") || requestURI.equals("/favicon.ico")) {
            filterChain.doFilter(request, response);
            return;
        }

        log.info("收到请求: {} , Authorization头: {}", requestURI, request.getHeader("Authorization"));
        try {
            String token = getJwtFromRequest(request);
            if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
                Long userId = tokenProvider.getUserIdFromToken(token);
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    UserDetails userDetails = org.springframework.security.core.userdetails.User
                            .withUsername(user.getUsername())
                            .password(user.getPassword())
                            .authorities(Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER")))
                            .build();
                    UsernamePasswordAuthenticationToken authentication =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    UserContextHolder.setCurrentUserId(userId);
                    log.info("用户认证成功: {} , 权限: {}", user.getUsername(), userDetails.getAuthorities());
                } else {
                    log.warn("用户不存在, userId: {}", userId);
                }
            } else {
                log.warn("未提供有效 token，路径：{}", requestURI);
            }
        } catch (Exception ex) {
            log.error("Could not set user authentication", ex);
        }
        filterChain.doFilter(request, response);
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}